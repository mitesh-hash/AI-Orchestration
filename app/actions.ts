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
import { createDiagram, diagramApprovalRepo } from "@/core/db/diagramRepository";
import { createDesignSystemNote } from "@/core/db/designSystemNoteRepository";
import {
  createWireframeSet,
  wireframeSetApprovalRepo,
} from "@/core/db/wireframeSetRepository";
import {
  createComparisonDraft,
  setComparisonContent,
  comparisonApprovalRepo,
} from "@/core/db/comparisonRepository";
import {
  createPrototypeExtractionDraft,
  setPrototypeExtractionContent,
  getPrototypeExtraction,
  prototypeExtractionApprovalRepo,
} from "@/core/db/prototypeExtractionRepository";
import {
  createPrototypeCrossCheck,
  prototypeCrossCheckApprovalRepo,
} from "@/core/db/prototypeCrossCheckRepository";
import { createDevSpec, devSpecApprovalRepo } from "@/core/db/devSpecRepository";
import { generateBrd } from "@/core/documentation/generateBrd";
import { extractActionItems } from "@/core/actions-tickets/extractActionItems";
import { generateProductDiscoveryTickets } from "@/core/actions-tickets/generateProductDiscoveryTickets";
import { generateDevelopmentTickets } from "@/core/actions-tickets/generateDevelopmentTickets";
import { generateUserFlowDiagram } from "@/core/diagramming/generateUserFlowDiagram";
import { generateWireframeOptions } from "@/core/diagramming/generateWireframeOptions";
import { generateComparison } from "@/core/comparison/generateComparison";
import { generatePrototypeStructure } from "@/core/comparison/generatePrototypeStructure";
import { generatePrototypeCrossCheck } from "@/core/comparison/generatePrototypeCrossCheck";
import { readPrototypeContent } from "@/core/comparison/prototypeContent";
import { generateDevSpec } from "@/core/devspec/generateDevSpec";
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

// FR-10/FR-9-style draft-only rule: derives a User Flow diagram from an
// existing BRD document. Never calls anything external -- writes a Diagram
// row with status PENDING_APPROVAL, same review flow as everything else.
export async function generateDiagramAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  const warnings: string[] = [];

  try {
    const document = await getDocument(documentId);
    const brdContent = document ? readBrdContent(document.content) : null;

    if (!brdContent) {
      warnings.push("Diagram not generated: could not read the source BRD's content.");
    } else {
      const result = await generateUserFlowDiagram(brdContent);
      if (result.status === "insufficient_input") {
        warnings.push(`Diagram not generated: ${result.reason}`);
      } else {
        await createDiagram(documentId, result.draft);
        if (result.draft.gaps.length > 0) {
          const gapSummary = result.draft.gaps.map((g) => `${g.section}: ${g.reason}`).join(" | ");
          warnings.push(`Some parts of the flow were left out: ${gapSummary}`);
        }
      }
    }
  } catch (err) {
    warnings.push(`Diagram generation failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-18/FR-19 for diagrams -- identical guardrail, different repo, same
// reuse pattern as approveTicketAction/rejectTicketAction.
export async function approveDiagramAction(formData: FormData): Promise<void> {
  const diagramId = String(formData.get("diagramId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(diagramApprovalRepo, diagramId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectDiagramAction(formData: FormData): Promise<void> {
  const diagramId = String(formData.get("diagramId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(diagramApprovalRepo, diagramId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

// FR-11/FR-9-style draft-only rule: saves a pasted design-system note and
// drafts 2-3 rough wireframe options from it plus the existing BRD, in one
// step (same pattern as addDevSpecAndGenerateTicketsAction). The note is
// always saved even if generation fails, so the input is never lost.
export async function addDesignSystemNoteAndGenerateWireframesAction(
  formData: FormData
): Promise<void> {
  const transcriptId = String(formData.get("transcriptId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const rawText = String(formData.get("rawText") ?? "");
  const title = String(formData.get("title") ?? "").trim() || undefined;

  const warnings: string[] = [];

  const designSystemNote = await createDesignSystemNote({ transcriptId, title, rawText });

  try {
    const document = await getDocument(documentId);
    const brdContent = document ? readBrdContent(document.content) : null;

    if (!brdContent) {
      warnings.push("Wireframes not generated: could not read the source BRD's content.");
    } else {
      const result = await generateWireframeOptions(brdContent, designSystemNote.rawText);
      if (result.status === "insufficient_input") {
        warnings.push(`Wireframes not generated: ${result.reason}`);
      } else {
        await createWireframeSet(documentId, designSystemNote.id, result.draft);
        if (result.draft.gaps.length > 0) {
          const gapSummary = result.draft.gaps.map((g) => `${g.section}: ${g.reason}`).join(" | ");
          warnings.push(`Some things weren't specified: ${gapSummary}`);
        }
      }
    }
  } catch (err) {
    warnings.push(`Wireframe generation failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-18/FR-19 for wireframe sets -- the whole set of 2-3 options is
// approved/rejected as one decision (see the schema comment on
// WireframeSet). Same guardrail, different repo.
export async function approveWireframeSetAction(formData: FormData): Promise<void> {
  const wireframeSetId = String(formData.get("wireframeSetId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(wireframeSetApprovalRepo, wireframeSetId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectWireframeSetAction(formData: FormData): Promise<void> {
  const wireframeSetId = String(formData.get("wireframeSetId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(wireframeSetApprovalRepo, wireframeSetId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

// FR-12/13: saves both pasted texts immediately (so nothing is lost if
// generation fails) and diffs them in one step, same paste-and-generate
// pattern as addDevSpecAndGenerateTicketsAction.
export async function generateComparisonAction(formData: FormData): Promise<void> {
  const transcriptId = String(formData.get("transcriptId") ?? "");
  const labelA = String(formData.get("labelA") ?? "").trim() || undefined;
  const textA = String(formData.get("textA") ?? "");
  const labelB = String(formData.get("labelB") ?? "").trim() || undefined;
  const textB = String(formData.get("textB") ?? "");

  const warnings: string[] = [];

  const comparison = await createComparisonDraft({ transcriptId, labelA, textA, labelB, textB });

  try {
    const result = await generateComparison(
      labelA ?? "Version A",
      comparison.textA,
      labelB ?? "Version B",
      comparison.textB
    );
    if (result.status === "insufficient_input") {
      warnings.push(`Comparison not generated: ${result.reason}`);
    } else {
      await setComparisonContent(comparison.id, result.draft);
      const conflictCount = result.draft.rows.filter((r) => r.isConflict).length;
      if (conflictCount > 0) {
        warnings.push(
          `${conflictCount} genuine conflict${conflictCount === 1 ? "" : "s"} found (FR-13) -- see the comparison below.`
        );
      }
    }
  } catch (err) {
    warnings.push(`Comparison generation failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-18/FR-19 for comparisons -- identical guardrail, different repo.
export async function approveComparisonAction(formData: FormData): Promise<void> {
  const comparisonId = String(formData.get("comparisonId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(comparisonApprovalRepo, comparisonId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectComparisonAction(formData: FormData): Promise<void> {
  const comparisonId = String(formData.get("comparisonId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(comparisonApprovalRepo, comparisonId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

// FR-14: saves the pasted prototype HTML immediately, then extracts its
// structure in one step -- same always-preserve-input pattern as the
// comparison and dev-spec/design-system actions above.
export async function addPrototypeAndExtractAction(formData: FormData): Promise<void> {
  const transcriptId = String(formData.get("transcriptId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || undefined;
  const rawHtml = String(formData.get("rawHtml") ?? "");

  const warnings: string[] = [];

  const extraction = await createPrototypeExtractionDraft({ transcriptId, title, rawHtml });

  try {
    const result = await generatePrototypeStructure(extraction.rawHtml);
    if (result.status === "insufficient_input") {
      warnings.push(`Prototype structure not extracted: ${result.reason}`);
    } else {
      await setPrototypeExtractionContent(extraction.id, result.draft);
    }
  } catch (err) {
    warnings.push(`Prototype extraction failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-18/FR-19 for prototype extractions -- identical guardrail, different
// repo.
export async function approvePrototypeExtractionAction(formData: FormData): Promise<void> {
  const prototypeExtractionId = String(formData.get("prototypeExtractionId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(prototypeExtractionApprovalRepo, prototypeExtractionId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectPrototypeExtractionAction(formData: FormData): Promise<void> {
  const prototypeExtractionId = String(formData.get("prototypeExtractionId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(prototypeExtractionApprovalRepo, prototypeExtractionId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

// FR-15: cross-checks an existing BRD against an existing prototype
// extraction. Both inputs already persist independently, so unlike the
// actions above there's no "always save the input" step here -- nothing of
// the user's would be lost by a failed attempt, just re-clickable.
export async function generatePrototypeCrossCheckAction(formData: FormData): Promise<void> {
  const transcriptId = String(formData.get("transcriptId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const prototypeExtractionId = String(formData.get("prototypeExtractionId") ?? "");

  const warnings: string[] = [];

  try {
    const [document, extraction] = await Promise.all([
      getDocument(documentId),
      getPrototypeExtraction(prototypeExtractionId),
    ]);
    const brdContent = document ? readBrdContent(document.content) : null;
    const prototypeContent = extraction ? readPrototypeContent(extraction.content) : null;

    if (!brdContent || !prototypeContent) {
      warnings.push("Cross-check not generated: could not read the BRD or prototype content.");
    } else {
      const result = await generatePrototypeCrossCheck(brdContent, prototypeContent);
      if (result.status === "insufficient_input") {
        warnings.push(`Cross-check not generated: ${result.reason}`);
      } else {
        await createPrototypeCrossCheck(documentId, prototypeExtractionId, result.draft);
        if (result.draft.mismatches.length > 0) {
          warnings.push(
            `${result.draft.mismatches.length} mismatch${result.draft.mismatches.length === 1 ? "" : "es"} found (FR-15) -- see the cross-check below.`
          );
        }
      }
    }
  } catch (err) {
    warnings.push(`Cross-check generation failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-18/FR-19 for prototype cross-checks -- identical guardrail, different
// repo.
export async function approvePrototypeCrossCheckAction(formData: FormData): Promise<void> {
  const crossCheckId = String(formData.get("crossCheckId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(prototypeCrossCheckApprovalRepo, crossCheckId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectPrototypeCrossCheckAction(formData: FormData): Promise<void> {
  const crossCheckId = String(formData.get("crossCheckId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(prototypeCrossCheckApprovalRepo, crossCheckId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

// FR-16/17: drafts developer specs (validations, business rules,
// error/success messages) from an existing BRD and an existing prototype
// extraction. Both inputs already persist independently, so like the
// prototype cross-check there's no "always save the input" step -- a
// failed attempt is just re-clickable, nothing of the user's is at risk.
export async function generateDevSpecAction(formData: FormData): Promise<void> {
  const transcriptId = String(formData.get("transcriptId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const prototypeExtractionId = String(formData.get("prototypeExtractionId") ?? "");

  const warnings: string[] = [];

  try {
    const [document, extraction] = await Promise.all([
      getDocument(documentId),
      getPrototypeExtraction(prototypeExtractionId),
    ]);
    const brdContent = document ? readBrdContent(document.content) : null;
    const prototypeContent = extraction ? readPrototypeContent(extraction.content) : null;

    if (!brdContent || !prototypeContent) {
      warnings.push("Developer spec not generated: could not read the BRD or prototype content.");
    } else {
      const result = await generateDevSpec(brdContent, prototypeContent);
      if (result.status === "insufficient_input") {
        warnings.push(`Developer spec not generated: ${result.reason}`);
      } else {
        await createDevSpec(documentId, prototypeExtractionId, result.draft);
        const needsConfirmationCount = result.draft.rules.filter((r) => r.needsConfirmation).length;
        if (needsConfirmationCount > 0) {
          warnings.push(
            `${needsConfirmationCount} rule${needsConfirmationCount === 1 ? "" : "s"} need${needsConfirmationCount === 1 ? "s" : ""} confirmation (FR-17) -- see the developer spec below.`
          );
        }
        if (result.draft.gaps.length > 0) {
          const gapSummary = result.draft.gaps.map((g) => `${g.section}: ${g.reason}`).join(" | ");
          warnings.push(`Some areas had no basis to draft a rule at all: ${gapSummary}`);
        }
      }
    }
  } catch (err) {
    warnings.push(`Developer spec generation failed: ${errorMessage(err)}`);
  }

  const query = warnings.length > 0 ? `?warning=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/review/${transcriptId}${query}`);
}

// FR-18/FR-19 for developer specs -- identical guardrail, different repo.
export async function approveDevSpecAction(formData: FormData): Promise<void> {
  const devSpecId = String(formData.get("devSpecId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await approveDocument(devSpecApprovalRepo, devSpecId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}

export async function rejectDevSpecAction(formData: FormData): Promise<void> {
  const devSpecId = String(formData.get("devSpecId") ?? "");
  const approverName = String(formData.get("approverName") ?? "");
  const transcriptId = String(formData.get("transcriptId") ?? "");

  await rejectDocument(devSpecApprovalRepo, devSpecId, approverName);
  revalidatePath(`/review/${transcriptId}`);
}
