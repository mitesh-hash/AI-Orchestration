import { describe, expect, it } from "vitest";
import { validateWireframeOptionsDraft } from "@/core/guardrails/wireframeValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validDraft = {
  options: [
    {
      name: "Option A: single column",
      regions: [
        {
          label: "Primary CTA button (dark blue rounded rect per design system)",
          kind: "button",
          sourceRefs: [{ quoteOrParaphrase: "primary button is dark blue rounded rect" }],
        },
      ],
    },
  ],
  gaps: [],
};

describe("validateWireframeOptionsDraft (FR-11 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validateWireframeOptionsDraft(validDraft)).not.toThrow();
  });

  it("accepts up to 3 options", () => {
    const draft = { ...validDraft, options: [validDraft.options[0], validDraft.options[0], validDraft.options[0]] };
    expect(() => validateWireframeOptionsDraft(draft)).not.toThrow();
  });

  it("rejects more than 3 options (never pads with a fourth)", () => {
    const draft = {
      ...validDraft,
      options: [validDraft.options[0], validDraft.options[0], validDraft.options[0], validDraft.options[0]],
    };
    expect(() => validateWireframeOptionsDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects a region with no source references", () => {
    const draft = {
      ...validDraft,
      options: [{ ...validDraft.options[0], regions: [{ ...validDraft.options[0].regions[0], sourceRefs: [] }] }],
    };
    expect(() => validateWireframeOptionsDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects an invalid region kind", () => {
    const draft = {
      ...validDraft,
      options: [{ ...validDraft.options[0], regions: [{ ...validDraft.options[0].regions[0], kind: "sidebar-thing" }] }],
    };
    expect(() => validateWireframeOptionsDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("accepts a single option alongside gaps (nothing else groundable)", () => {
    const draft = {
      options: [validDraft.options[0]],
      gaps: [{ section: "Alternate layout", reason: "BRD doesn't describe enough variation for a second option." }],
    };
    const result = validateWireframeOptionsDraft(draft);
    expect(result.options).toHaveLength(1);
    expect(result.gaps).toHaveLength(1);
  });
});
