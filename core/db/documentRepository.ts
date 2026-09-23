import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { BrdDraft } from "../llm/schemas";

// The Prisma-backed implementation of the guardrail's ApprovalRepo
// interface. Both status-changing methods write the approver + timestamp
// in the same update as the status change (FR-19) -- there is no code path
// that sets APPROVED/REJECTED without also recording who and when.
export const documentApprovalRepo: ApprovalRepo = {
  async getStatus(documentId) {
    const doc = await prisma.requirementDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    return (doc?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(documentId, approverName, approvedAt) {
    await prisma.requirementDocument.update({
      where: { id: documentId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(documentId, approverName, rejectedAt) {
    await prisma.requirementDocument.update({
      where: { id: documentId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};

export async function createBrdDocument(transcriptId: string, draft: BrdDraft) {
  return prisma.requirementDocument.create({
    data: {
      type: "BRD",
      content: { title: draft.title, sections: draft.sections },
      gaps: draft.gaps,
      status: "PENDING_APPROVAL",
      transcripts: { connect: { id: transcriptId } },
    },
  });
}

export async function getDocument(id: string) {
  return prisma.requirementDocument.findUnique({
    where: { id },
    include: { transcripts: true },
  });
}

export async function listDocuments() {
  return prisma.requirementDocument.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listDocumentsForTranscript(transcriptId: string) {
  return prisma.requirementDocument.findMany({
    where: { transcripts: { some: { id: transcriptId } } },
    orderBy: { createdAt: "desc" },
  });
}
