import { describe, expect, it } from "vitest";
import { validateTicketsDraft } from "@/core/guardrails/ticketValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validDraft = {
  tickets: [
    {
      milestone: "User Journey",
      title: "Surface shipping cost on the cart page",
      description: "Add an estimated shipping cost line to the cart page.",
      sourceRefs: [{ quoteOrParaphrase: "show estimated shipping cost on the cart page" }],
    },
  ],
  gaps: [],
};

describe("validateTicketsDraft (FR-7 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validateTicketsDraft(validDraft)).not.toThrow();
  });

  it("rejects a ticket with no source references back to the BRD", () => {
    const draft = {
      ...validDraft,
      tickets: [{ ...validDraft.tickets[0], sourceRefs: [] }],
    };
    expect(() => validateTicketsDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects a ticket with a milestone outside the fixed three", () => {
    const draft = {
      ...validDraft,
      tickets: [{ ...validDraft.tickets[0], milestone: "Marketing" }],
    };
    expect(() => validateTicketsDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("accepts an empty tickets array alongside gaps (nothing groundable)", () => {
    const draft = {
      tickets: [],
      gaps: [{ section: "Design", reason: "BRD never discusses a design phase." }],
    };
    const result = validateTicketsDraft(draft);
    expect(result.tickets).toHaveLength(0);
    expect(result.gaps).toHaveLength(1);
  });

  it("rejects malformed input entirely", () => {
    expect(() => validateTicketsDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });
});
