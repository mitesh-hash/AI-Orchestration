import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { UserFlowDiagramDraft } from "../llm/schemas";

export async function createDiagram(sourceDocumentId: string, draft: UserFlowDiagramDraft) {
  return prisma.diagram.create({
    data: {
      sourceDocumentId,
      type: "USER_FLOW",
      content: { title: draft.title, nodes: draft.nodes, edges: draft.edges },
      gaps: draft.gaps,
      status: "PENDING_APPROVAL",
    },
  });
}

export async function listDiagramsForTranscript(transcriptId: string) {
  return prisma.diagram.findMany({
    where: { sourceDocument: { transcripts: { some: { id: transcriptId } } } },
    orderBy: { createdAt: "asc" },
  });
}

// Same guardrail interface as documentApprovalRepo/ticketApprovalRepo,
// backed by the Diagram table.
export const diagramApprovalRepo: ApprovalRepo = {
  async getStatus(diagramId) {
    const diagram = await prisma.diagram.findUnique({
      where: { id: diagramId },
      select: { status: true },
    });
    return (diagram?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(diagramId, approverName, approvedAt) {
    await prisma.diagram.update({
      where: { id: diagramId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(diagramId, approverName, rejectedAt) {
    await prisma.diagram.update({
      where: { id: diagramId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};
