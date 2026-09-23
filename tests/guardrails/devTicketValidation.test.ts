import { describe, expect, it } from "vitest";
import { validateDevTicketsDraft } from "@/core/guardrails/devTicketValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validDraft = {
  tickets: [
    {
      title: "Add shipping cost validation on the cart API",
      description: "Reject cart updates missing a shipping estimate before checkout.",
      sourceRefs: [{ quoteOrParaphrase: "shipping estimate must be present before checkout" }],
    },
  ],
  gaps: [],
};

describe("validateDevTicketsDraft (FR-8 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validateDevTicketsDraft(validDraft)).not.toThrow();
  });

  it("rejects a ticket with no source references back to the spec notes", () => {
    const draft = {
      ...validDraft,
      tickets: [{ ...validDraft.tickets[0], sourceRefs: [] }],
    };
    expect(() => validateDevTicketsDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("has no milestone field (unlike Product Discovery tickets)", () => {
    const result = validateDevTicketsDraft(validDraft);
    expect(result.tickets[0]).not.toHaveProperty("milestone");
  });

  it("accepts an empty tickets array alongside gaps (nothing groundable)", () => {
    const draft = {
      tickets: [],
      gaps: [{ section: "Validation rules", reason: "Spec notes never state the rule." }],
    };
    const result = validateDevTicketsDraft(draft);
    expect(result.tickets).toHaveLength(0);
    expect(result.gaps).toHaveLength(1);
  });

  it("rejects malformed input entirely", () => {
    expect(() => validateDevTicketsDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });
});
