import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { TicketDraft } from "../llm/schemas";

export async function createTickets(sourceDocumentId: string, tickets: TicketDraft[]) {
  return prisma.$transaction(
    tickets.map((ticket) =>
      prisma.ticket.create({
        data: {
          sourceDocumentId,
          type: "PRODUCT_DISCOVERY",
          milestone: ticket.milestone,
          title: ticket.title,
          description: ticket.description,
          sourceRefs: ticket.sourceRefs,
          status: "PENDING_APPROVAL",
        },
      })
    )
  );
}

export async function listTicketsForDocument(sourceDocumentId: string) {
  return prisma.ticket.findMany({
    where: { sourceDocumentId },
    orderBy: { createdAt: "asc" },
  });
}

// Same guardrail interface as documentApprovalRepo, just backed by the
// Ticket table -- the approval state machine in core/guardrails/approvalGate
// doesn't know or care which entity it's approving.
export const ticketApprovalRepo: ApprovalRepo = {
  async getStatus(ticketId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });
    return (ticket?.status as DocumentStatus | undefined) ?? null;
  },

  async markApproved(ticketId, approverName, approvedAt) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "APPROVED", approvedBy: approverName, approvedAt },
    });
  },

  async markRejected(ticketId, approverName, rejectedAt) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "REJECTED", approvedBy: approverName, approvedAt: rejectedAt },
    });
  },
};
