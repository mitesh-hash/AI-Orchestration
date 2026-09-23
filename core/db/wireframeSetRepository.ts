import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { WireframeOptionsDraft } from "../llm/schemas";

export async function createWireframeSet(
  sourceDocumentId: string,
  designSystemNoteId: string,
  draft: WireframeOptionsDraft
) {
  return prisma.wireframeSet.create({
    data: {
      sourceDocumentId,
      designSystemNoteId,
      content: { options: draft.options },
      gaps: draft.gaps,
      status: "PENDING_APPROVAL",
    },
  });
}

export async function listWireframeSetsForTranscript(transcriptId: string) {
  return prisma.wireframeSet.findMany({
    where: { sourceDocument: { transcripts: { some: { id: transcriptId } } } },
    orderBy: { createdAt: "asc" },
  });
}

// Same guardrail interface as the other Approval repos, backed by the
// WireframeSet table -- the whole set of 2-3 options is approved/rejected
// as one decision (see the schema comment on WireframeSet).
export const wireframeSetApprovalRepo: ApprovalRepo = {
  async getStatus(wireframeSetId) {
    const set = await prisma.wireframeSet.findUnique({
      where: { id: wireframeSetId },
      select: { status: true },
    });
    return (set?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(wireframeSetId, approverName, approvedAt) {
    await prisma.wireframeSet.update({
      where: { id: wireframeSetId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(wireframeSetId, approverName, rejectedAt) {
    await prisma.wireframeSet.update({
      where: { id: wireframeSetId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};
