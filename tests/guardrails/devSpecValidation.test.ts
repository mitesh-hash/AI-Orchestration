import { describe, expect, it } from "vitest";
import { validateDevSpecDraft } from "@/core/guardrails/devSpecValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validDraft = {
  rules: [
    {
      type: "validation",
      description: "Email field must match a valid email format",
      needsConfirmation: false,
      sourceRefs: [{ quoteOrParaphrase: "<input type=\"email\">" }],
    },
    {
      type: "message",
      description: "Show 'Item added to cart' on successful add",
      needsConfirmation: true,
      sourceRefs: [{ quoteOrParaphrase: "cart summary section shows a confirmation" }],
    },
  ],
  gaps: [],
};

describe("validateDevSpecDraft (FR-16/17 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validateDevSpecDraft(validDraft)).not.toThrow();
  });

  it("rejects a rule with no source references, confirmed or not", () => {
    const draft = { ...validDraft, rules: [{ ...validDraft.rules[0], sourceRefs: [] }] };
    expect(() => validateDevSpecDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects an invalid rule type", () => {
    const draft = { ...validDraft, rules: [{ ...validDraft.rules[0], type: "constraint" }] };
    expect(() => validateDevSpecDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("preserves the needsConfirmation flag per rule", () => {
    const result = validateDevSpecDraft(validDraft);
    expect(result.rules[0].needsConfirmation).toBe(false);
    expect(result.rules[1].needsConfirmation).toBe(true);
  });

  it("accepts zero rules alongside gaps (nothing groundable at all)", () => {
    const draft = {
      rules: [],
      gaps: [{ section: "Checkout form", reason: "Neither source describes any field-level rules." }],
    };
    const result = validateDevSpecDraft(draft);
    expect(result.rules).toHaveLength(0);
    expect(result.gaps).toHaveLength(1);
  });

  it("rejects malformed input entirely", () => {
    expect(() => validateDevSpecDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });
});
