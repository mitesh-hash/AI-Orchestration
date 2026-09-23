import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { DevSpecDraft } from "../llm/schemas";

// Only created once generation succeeds -- both inputs (the BRD and the
// PrototypeExtraction) already persist independently, same as
// PrototypeCrossCheck, so there's nothing of the user's to lose on a
// failed attempt.
export async function createDevSpec(
  sourceDocumentId: string,
  prototypeExtractionId: string,
  draft: DevSpecDraft
) {
  return prisma.devSpec.create({
    data: {
      sourceDocumentId,
      prototypeExtractionId,
      content: { rules: draft.rules, gaps: draft.gaps },
      status: "PENDING_APPROVAL",
    },
  });
}

export async function listDevSpecsForTranscript(transcriptId: string) {
  return prisma.devSpec.findMany({
    where: { prototypeExtraction: { transcriptId } },
    orderBy: { createdAt: "asc" },
  });
}

export const devSpecApprovalRepo: ApprovalRepo = {
  async getStatus(devSpecId) {
    const devSpec = await prisma.devSpec.findUnique({
      where: { id: devSpecId },
      select: { status: true },
    });
    return (devSpec?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(devSpecId, approverName, approvedAt) {
    await prisma.devSpec.update({
      where: { id: devSpecId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(devSpecId, approverName, rejectedAt) {
    await prisma.devSpec.update({
      where: { id: devSpecId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};
