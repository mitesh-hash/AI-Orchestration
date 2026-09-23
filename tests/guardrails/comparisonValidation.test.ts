import { describe, expect, it } from "vitest";
import { validateComparisonDraft } from "@/core/guardrails/comparisonValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validDraft = {
  rows: [
    {
      topic: "Return window",
      aSummary: "30 days",
      bSummary: "60 days",
      isConflict: true,
      sourceRefs: [{ quoteOrParaphrase: "returns accepted within 30 days" }],
    },
    {
      topic: "Shipping cost",
      aSummary: "Not mentioned",
      bSummary: "Free over $50",
      isConflict: false,
      sourceRefs: [{ quoteOrParaphrase: "free shipping over $50" }],
    },
  ],
};

describe("validateComparisonDraft (FR-12/13 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validateComparisonDraft(validDraft)).not.toThrow();
  });

  it("rejects a row with no source references", () => {
    const draft = { rows: [{ ...validDraft.rows[0], sourceRefs: [] }] };
    expect(() => validateComparisonDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects a conflict row whose two summaries are identical (degenerate conflict)", () => {
    const draft = {
      rows: [
        {
          topic: "Return window",
          aSummary: "30 days",
          bSummary: "30 days",
          isConflict: true,
          sourceRefs: [{ quoteOrParaphrase: "returns within 30 days" }],
        },
      ],
    };
    expect(() => validateComparisonDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("allows identical summaries when not flagged as a conflict", () => {
    const draft = {
      rows: [
        {
          topic: "Return window",
          aSummary: "30 days",
          bSummary: "30 days",
          isConflict: false,
          sourceRefs: [{ quoteOrParaphrase: "returns within 30 days" }],
        },
      ],
    };
    expect(() => validateComparisonDraft(draft)).not.toThrow();
  });

  it("rejects malformed input entirely", () => {
    expect(() => validateComparisonDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });
});
