import { GuardrailViolationError } from "./errors";
import type { DocumentStatus } from "./types";

// Narrow interface the guardrail depends on, so it's testable with an
// in-memory fake and the real Prisma-backed implementation lives in
// core/db. Deliberately has no method that can set APPROVED/REJECTED
// except through the two functions below.
export interface ApprovalRepo {
  getStatus(documentId: string): Promise<DocumentStatus | null>;
  markApproved(
    documentId: string,
    approverName: string,
    approvedAt: Date
  ): Promise<void>;
  markRejected(
    documentId: string,
    approverName: string,
    rejectedAt: Date
  ): Promise<void>;
}

function assertApproverName(approverName: string): string {
  const trimmed = approverName?.trim();
  if (!trimmed) {
    throw new GuardrailViolationError(
      "An approval/rejection decision requires a named reviewer (FR-19)."
    );
  }
  return trimmed;
}

async function assertPending(
  repo: ApprovalRepo,
  documentId: string
): Promise<void> {
  const status = await repo.getStatus(documentId);
  if (status === null) {
    throw new GuardrailViolationError(`No document found with id ${documentId}.`);
  }
  if (status !== "DRAFT" && status !== "PENDING_APPROVAL") {
    throw new GuardrailViolationError(
      `Document ${documentId} is already ${status}; it cannot be decided again.`
    );
  }
}

// FR-18: this is the ONLY function in the codebase permitted to move a
// document to APPROVED. No generation function, scheduler, or integration
// call may do this itself.
// FR-19: every approval carries an approver name and timestamp, written in
// the same operation as the status change (see the Prisma-backed
// implementation in core/db/documentRepository.ts).
export async function approveDocument(
  repo: ApprovalRepo,
  documentId: string,
  approverName: string
): Promise<void> {
  const name = assertApproverName(approverName);
  await assertPending(repo, documentId);
  await repo.markApproved(documentId, name, new Date());
}

// The counterpart for FR-18's "nothing is final without an explicit human
// decision" — rejecting is also an explicit, logged decision, not a default.
export async function rejectDocument(
  repo: ApprovalRepo,
  documentId: string,
  approverName: string
): Promise<void> {
  const name = assertApproverName(approverName);
  await assertPending(repo, documentId);
  await repo.markRejected(documentId, name, new Date());
}
