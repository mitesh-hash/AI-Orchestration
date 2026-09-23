"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createTranscript } from "@/core/db/transcriptRepository";
import {
  createBrdDocument,
  documentApprovalRepo,
  getDocument,
} from "@/core/db/documentRepository";
import { saveActionItems } from "@/core/db/actionItemRepository";
import {
  createProductDiscoveryTickets,
  createDevelopmentTickets,
  ticketApprovalRepo,
} from "@/core/db/ticketRepository";
import { createDevSpecNote } from "@/core/db/devSpecNoteRepository";
import { generateBrd } from "@/core/documentation/generateBrd";
import { extractActionItems } from "@/core/actions-tickets/extractActionItems";
import { generateProductDiscoveryTickets } from "@/core/actions-tickets/generateProductDiscoveryTickets";
import { generateDevelopmentTickets } from "@/core/actions-tickets/generateDevelopmentTickets";
import { approveDocument, rejectDocument } from "@/core/guardrails/approvalGate";
import { readBrdContent } from "@/core/documentation/brdContent";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error.";
}

// One orchestration action for the whole vertical slice: paste a
// transcript, get a first-draft BRD (FR-1/FR-2/FR-5) and an action-item
// table (FR-6) back. A failure generating either one is surfaced as a
// warning on the review page -- it never crashes the request and never
// falls back to inventing content.
export async function processTranscriptAction(formData: FormData): Promise<void> {
  const rawText = String(formData.get("rawText") ?? "");
  const title = String(formData.get("title") ?? "").trim() || undefined;
  const meetingDateRaw = String(formData.get("meetingDate") ?? "");
  const meetingDate = meetingDateRaw ? new Date(meetingDateRaw) : new Date();

  const transcript = await createTranscript({
    rawText,
    title,
    meetingDate,
    source: "paste",
  });

  const warnings: string[] = [];

  try {
    const brdResult = await generateBrd(transcript.rawText, transcript.meetingDate);
    if (brdResult.status === "insufficient_input") {
      warnings.push(`BRD not generated: ${brdResult.reason}`);
    } else {
      await createBrdDocument(transcript.id, brdResult.draft);
    }
  } catch (err) {
    warnings.push(`BRD generation failed: ${errorMessage(err)}`);
  }

  try {
    const actionItemsResult = await extractActionItems(transcript.rawText);
    if (actionItemsResult.status === "insufficient_input") {
      warnings.push(`Action items not extracted: ${actionItemsResult.reason}`);
    } else if (actionItemsResult.items.length > 0) {
      await saveActionItems(transcript.id, actionItemsResult.items);
    }
  } catch (err) {
    warnings.push(`Action item extraction failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcript.id}${query}`);
}

// FR-18/FR-19: the only server-side entry points that can move a BRD to
// APPROVED/REJECTED. Both delegate entirely to the guardrail in
// core/guardrails/approvalGate.ts -- this action does no state-changing
// work of its own beyond calling it.
export async function approveDocumentAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(documentApprovalRepo, documentId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectDocumentAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(documentApprovalRepo, documentId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

// FR-7/FR-9: drafts Product Discovery tickets from an existing BRD document.
// Never calls Jira -- this only ever writes ticket rows with status
// PENDING_APPROVAL, which a reviewer then approves/rejects like any other
// draft. A failure here is surfaced as a warning, same pattern as
// processTranscriptAction -- it never crashes and never fabricates a ticket.
export async function generateTicketsAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  const warnings: string[] = [];

  try {
    const document = await getDocument(documentId);
    const brdContent = document ? readBrdContent(document.content) : null;

    if (!brdContent) {
      warnings.push("Tickets not generated: could not read the source BRD's content.");
    } else {
      const result = await generateProductDiscoveryTickets(brdContent);
      if (result.status === "insufficient_input") {
        warnings.push(`Tickets not generated: ${result.reason}`);
      } else {
        if (result.tickets.length > 0) {
          await createProductDiscoveryTickets(documentId, result.tickets);
        }
        if (result.gaps.length > 0) {
          const gapSummary = result.gaps.map((g) => `${g.section}: ${g.reason}`).join(" | ");
          warnings.push(`Some milestones were skipped: ${gapSummary}`);
        }
      }
    }
  } catch (err) {
    warnings.push(`Ticket generation failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-8/FR-9: saves a pasted "signed-off design and developer specs" note and
// drafts development/technical tickets from it in one step, mirroring how
// processTranscriptAction saves a transcript and generates a BRD together.
// The note is always saved even if generation fails or is skipped, so the
// input itself is never lost. Never calls Jira -- same draft-only pattern
// as generateTicketsAction.
export async function addDevSpecAndGenerateTicketsAction(formData: FormData): Promise<void> {
  const transcriptId = String(formData.get("transcriptId") ?? "");
  const rawText = String(formData.get("rawText") ?? "");
  const title = String(formData.get("title") ?? "").trim() || undefined;

  const warnings: string[] = [];

  const devSpecNote = await createDevSpecNote({ transcriptId, title, rawText });

  try {
    const result = await generateDevelopmentTickets(devSpecNote.rawText);
    if (result.status === "insufficient_input") {
      warnings.push(`Development tickets not generated: ${result.reason}`);
    } else {
      if (result.tickets.length > 0) {
        await createDevelopmentTickets(devSpecNote.id, result.tickets);
      }
      if (result.gaps.length > 0) {
        const gapSummary = result.gaps.map((g) => `${g.section}: ${g.reason}`).join(" | ");
        warnings.push(`Some items were skipped: ${gapSummary}`);
      }
    }
  } catch (err) {
    warnings.push(`Development ticket generation failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-18/FR-19 for tickets -- identical guardrail, different repo. Reused
// as-is for both Product Discovery and Development tickets: the guardrail
// doesn't know or care which type it's approving. See the comment on
// approveDocumentAction/rejectDocumentAction above.
export async function approveTicketAction(formData: FormData): Promise<void> {
  const ticketId = String(formData.get("ticketId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(ticketApprovalRepo, ticketId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectTicketAction(formData: FormData): Promise<void> {
  const ticketId = String(formData.get("ticketId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(ticketApprovalRepo, ticketId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}
