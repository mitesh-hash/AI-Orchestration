import { prisma } from "./prisma";
import type { ApprovalRepo } from "../guardrails/approvalGate";
import type { DocumentStatus } from "../guardrails/types";
import type { TicketDraft, DevTicketDraft } from "../llm/schemas";

// FR-7: tickets sourced from a BRD (RequirementDocument). sourceDevSpecId is
// deliberately left unset -- see the schema comment on Ticket for why the
// two source fields never both get populated.
export async function createProductDiscoveryTickets(
  sourceDocumentId: string,
  tickets: TicketDraft[]
) {
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

// FR-8: tickets sourced from a pasted DevSpecNote. sourceDocumentId is left
// unset, mirroring createProductDiscoveryTickets.
export async function createDevelopmentTickets(
  sourceDevSpecId: string,
  tickets: DevTicketDraft[]
) {
  return prisma.$transaction(
    tickets.map((ticket) =>
      prisma.ticket.create({
        data: {
          sourceDevSpecId,
          type: "DEVELOPMENT",
          title: ticket.title,
          description: ticket.description,
          sourceRefs: ticket.sourceRefs,
          status: "PENDING_APPROVAL",
        },
      })
    )
  );
}

// All tickets for a transcript regardless of type/source -- Product
// Discovery tickets reach it via the BRD's transcripts, development tickets
// via their DevSpecNote's transcriptId.
export async function listTicketsForTranscript(transcriptId: string) {
  return prisma.ticket.findMany({
    where: {
      OR: [
        { sourceDocument: { transcripts: { some: { id: transcriptId } } } },
        { sourceDevSpec: { transcriptId } },
      ],
    },
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
