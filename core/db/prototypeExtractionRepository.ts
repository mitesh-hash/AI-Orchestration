import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { PrototypeStructureDraft } from "../llm/schemas";

export interface CreatePrototypeExtractionDraftInput {
  transcriptId: string;
  title?: string;
  rawHtml: string;
}

// Always created first, before generation runs -- the pasted HTML must
// survive a failed or skipped extraction, same principle as Comparison.
export async function createPrototypeExtractionDraft(input: CreatePrototypeExtractionDraftInput) {
  return prisma.prototypeExtraction.create({ data: { ...input, status: "DRAFT" } });
}

export async function setPrototypeExtractionContent(id: string, draft: PrototypeStructureDraft) {
  return prisma.prototypeExtraction.update({
    where: { id },
    data: {
      content: { title: draft.title, sections: draft.sections },
      status: "PENDING_APPROVAL",
    },
  });
}

export async function getPrototypeExtraction(id: string) {
  return prisma.prototypeExtraction.findUnique({ where: { id } });
}

export async function listPrototypeExtractionsForTranscript(transcriptId: string) {
  return prisma.prototypeExtraction.findMany({
    where: { transcriptId },
    orderBy: { createdAt: "asc" },
  });
}

export const prototypeExtractionApprovalRepo: ApprovalRepo = {
  async getStatus(prototypeExtractionId) {
    const extraction = await prisma.prototypeExtraction.findUnique({
      where: { id: prototypeExtractionId },
      select: { status: true },
    });
    return (extraction?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(prototypeExtractionId, approverName, approvedAt) {
    await prisma.prototypeExtraction.update({
      where: { id: prototypeExtractionId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(prototypeExtractionId, approverName, rejectedAt) {
    await prisma.prototypeExtraction.update({
      where: { id: prototypeExtractionId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};
