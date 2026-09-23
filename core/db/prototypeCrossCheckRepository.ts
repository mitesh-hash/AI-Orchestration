import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { PrototypeCrossCheckDraft } from "../llm/schemas";

// Only created once generation succeeds -- both its inputs (the BRD and the
// PrototypeExtraction) already persist independently, so unlike Comparison
// and PrototypeExtraction there's nothing of the user's to preserve on a
// failed attempt.
export async function createPrototypeCrossCheck(
  sourceDocumentId: string,
  prototypeExtractionId: string,
  draft: PrototypeCrossCheckDraft
) {
  return prisma.prototypeCrossCheck.create({
    data: {
      sourceDocumentId,
      prototypeExtractionId,
      content: { mismatches: draft.mismatches, notCheckable: draft.notCheckable },
      status: "PENDING_APPROVAL",
    },
  });
}

export async function listPrototypeCrossChecksForTranscript(transcriptId: string) {
  return prisma.prototypeCrossCheck.findMany({
    where: { prototypeExtraction: { transcriptId } },
    orderBy: { createdAt: "asc" },
  });
}

export const prototypeCrossCheckApprovalRepo: ApprovalRepo = {
  async getStatus(crossCheckId) {
    const crossCheck = await prisma.prototypeCrossCheck.findUnique({
      where: { id: crossCheckId },
      select: { status: true },
    });
    return (crossCheck?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(crossCheckId, approverName, approvedAt) {
    await prisma.prototypeCrossCheck.update({
      where: { id: crossCheckId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(crossCheckId, approverName, rejectedAt) {
    await prisma.prototypeCrossCheck.update({
      where: { id: crossCheckId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};
