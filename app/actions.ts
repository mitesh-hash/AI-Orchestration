"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createTranscript } from "@/core/db/transcriptRepository";
import {
  createBrdDocument,
  documentApprovalRepo,
} from "@/core/db/documentRepository";
import { saveActionItems } from "@/core/db/actionItemRepository";
import { generateBrd } from "@/core/documentation/generateBrd";
import { extractActionItems } from "@/core/actions-tickets/extractActionItems";
import { approveDocument, rejectDocument } from "@/core/guardrails/approvalGate";

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
