import { describe, expect, it } from "vitest";
import { validateBrdDraft } from "@/core/guardrails/brdValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validDraft = {
  title: "Checkout redesign BRD",
  sections: [
    {
      heading: "Problem Statement",
      text: "Checkout abandonment is high because shipping cost is hidden until the final step.",
      sourceRefs: [{ quoteOrParaphrase: "users can't see shipping cost until the final step" }],
    },
  ],
  gaps: [],
};

describe("validateBrdDraft (FR-2 / FR-5 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validateBrdDraft(validDraft)).not.toThrow();
  });

  it("rejects a section with no source references", () => {
    const draft = {
      ...validDraft,
      sections: [{ ...validDraft.sections[0], sourceRefs: [] }],
    };
    expect(() => validateBrdDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects a draft with no sections at all", () => {
    const draft = { ...validDraft, sections: [] };
    expect(() => validateBrdDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects malformed input entirely", () => {
    expect(() => validateBrdDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });

  it("passes through flagged gaps unchanged", () => {
    const draft = {
      ...validDraft,
      gaps: [{ section: "Success Metrics", reason: "Not discussed in this transcript." }],
    };
    const result = validateBrdDraft(draft);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].section).toBe("Success Metrics");
  });
});
