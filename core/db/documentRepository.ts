import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { BrdDraft, FrdDraft, PrdDraft } from "../llm/schemas";

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

// FR-3: same shape as createBrdDocument -- an FRD is a RequirementDocument
// with type FRD, linked to the same transcript as the BRD it was drafted
// from. Reuses documentApprovalRepo/approveDocumentAction unchanged (they
// operate on id/status only, not type).
export async function createFrdDocument(transcriptId: string, draft: FrdDraft) {
  return prisma.requirementDocument.create({
    data: {
      type: "FRD",
      content: { title: draft.title, sections: draft.sections },
      gaps: draft.gaps,
      status: "PENDING_APPROVAL",
      transcripts: { connect: { id: transcriptId } },
    },
  });
}

// FR-4: same shape again, type PRD.
export async function createPrdDocument(transcriptId: string, draft: PrdDraft) {
  return prisma.requirementDocument.create({
    data: {
      type: "PRD",
      content: { title: draft.title, sections: draft.sections },
      gaps: draft.gaps,
      status: "PENDING_APPROVAL",
      transcripts: { connect: { id: transcriptId } },
    },
  });
}

// FR-5a: purely a user-entered reference to which real Confluence page an
// approved PRD corresponds to -- never used to make a live API call, so
// this is a plain field update, not a guardrail-gated action.
export async function updateConfluencePageLink(
  documentId: string,
  input: { pageTitle?: string; pageUrl?: string }
) {
  return prisma.requirementDocument.update({
    where: { id: documentId },
    data: { confluencePageTitle: input.pageTitle, confluencePageUrl: input.pageUrl },
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
