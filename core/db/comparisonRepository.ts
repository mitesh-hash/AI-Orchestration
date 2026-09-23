import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { ComparisonDraft } from "../llm/schemas";

export interface CreateComparisonDraftInput {
  transcriptId: string;
  labelA?: string;
  textA: string;
  labelB?: string;
  textB: string;
}

// Always created first, before generation runs -- textA/textB are the
// user's input and must survive a failed or skipped generation, same
// principle as Transcript vs RequirementDocument in slice 1.
export async function createComparisonDraft(input: CreateComparisonDraftInput) {
  return prisma.comparison.create({ data: { ...input, status: "DRAFT" } });
}

export async function setComparisonContent(id: string, draft: ComparisonDraft) {
  return prisma.comparison.update({
    where: { id },
    data: { content: { rows: draft.rows }, status: "PENDING_APPROVAL" },
  });
}

export async function listComparisonsForTranscript(transcriptId: string) {
  return prisma.comparison.findMany({
    where: { transcriptId },
    orderBy: { createdAt: "asc" },
  });
}

export const comparisonApprovalRepo: ApprovalRepo = {
  async getStatus(comparisonId) {
    const comparison = await prisma.comparison.findUnique({
      where: { id: comparisonId },
      select: { status: true },
    });
    return (comparison?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(comparisonId, approverName, approvedAt) {
    await prisma.comparison.update({
      where: { id: comparisonId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(comparisonId, approverName, rejectedAt) {
    await prisma.comparison.update({
      where: { id: comparisonId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};
