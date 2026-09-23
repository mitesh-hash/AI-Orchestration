import { describe, expect, it } from "vitest";
import { approveDocument, rejectDocument, type ApprovalRepo } from "@/core/guardrails/approvalGate";
import { GuardrailViolationError } from "@/core/guardrails/errors";
import type { DocumentStatus } from "@/core/guardrails/types";

function makeFakeRepo(initialStatus: DocumentStatus | null) {
  const state: {
    status: DocumentStatus | null;
    approvedBy: string | null;
    approvedAt: Date | null;
  } = { status: initialStatus, approvedBy: null, approvedAt: null };

  const repo: ApprovalRepo = {
    async getStatus() {
      return state.status;
    },
    async markApproved(_id, approverName, approvedAt) {
      state.status = "APPROVED";
      state.approvedBy = approverName;
      state.approvedAt = approvedAt;
    },
    async markRejected(_id, approverName, rejectedAt) {
      state.status = "REJECTED";
      state.approvedBy = approverName;
      state.approvedAt = rejectedAt;
    },
  };

  return { repo, state };
}

describe("approveDocument / rejectDocument (FR-18 / FR-19)", () => {
  it("approves a pending document and records who and when", async () => {
    const { repo, state } = makeFakeRepo("PENDING_APPROVAL");
    await approveDocument(repo, "doc-1", "Priya");
    expect(state.status).toBe("APPROVED");
    expect(state.approvedBy).toBe("Priya");
    expect(state.approvedAt).toBeInstanceOf(Date);
  });

  it("rejects a pending document and records who and when", async () => {
    const { repo, state } = makeFakeRepo("DRAFT");
    await rejectDocument(repo, "doc-1", "Alex");
    expect(state.status).toBe("REJECTED");
    expect(state.approvedBy).toBe("Alex");
  });

  it("refuses to approve without a named approver", async () => {
    const { repo } = makeFakeRepo("PENDING_APPROVAL");
    await expect(approveDocument(repo, "doc-1", "")).rejects.toThrow(GuardrailViolationError);
    await expect(approveDocument(repo, "doc-1", "   ")).rejects.toThrow(GuardrailViolationError);
  });

  it("refuses to approve a document that doesn't exist", async () => {
    const { repo } = makeFakeRepo(null);
    await expect(approveDocument(repo, "missing", "Priya")).rejects.toThrow(GuardrailViolationError);
  });

  it("refuses to approve a document that is already approved", async () => {
    const { repo } = makeFakeRepo("APPROVED");
    await expect(approveDocument(repo, "doc-1", "Priya")).rejects.toThrow(GuardrailViolationError);
  });

  it("refuses to approve a document that has already been rejected", async () => {
    const { repo } = makeFakeRepo("REJECTED");
    await expect(approveDocument(repo, "doc-1", "Priya")).rejects.toThrow(GuardrailViolationError);
  });

  it("refuses to reject without a named reviewer", async () => {
    const { repo } = makeFakeRepo("PENDING_APPROVAL");
    await expect(rejectDocument(repo, "doc-1", "")).rejects.toThrow(GuardrailViolationError);
  });
});
