import { describe, expect, it } from "vitest";
import {
  validatePrototypeStructureDraft,
  validatePrototypeCrossCheckDraft,
} from "@/core/guardrails/prototypeValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validStructure = {
  title: "Checkout prototype",
  sections: [
    {
      name: "Cart summary",
      elements: [
        {
          kind: "button",
          label: "Checkout",
          sourceRefs: [{ quoteOrParaphrase: "<button>Checkout</button>" }],
        },
      ],
    },
  ],
};

const validCrossCheck = {
  mismatches: [
    {
      topic: "CTA label",
      documented: "BRD says the button should read 'Add to cart'",
      prototypeShows: "Prototype button reads 'Add to Bag'",
      sourceRefs: [{ quoteOrParaphrase: "Add to Bag" }],
    },
  ],
  notCheckable: [],
};

describe("validatePrototypeStructureDraft (FR-14 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validatePrototypeStructureDraft(validStructure)).not.toThrow();
  });

  it("rejects an element with no source references", () => {
    const draft = {
      ...validStructure,
      sections: [{ ...validStructure.sections[0], elements: [{ ...validStructure.sections[0].elements[0], sourceRefs: [] }] }],
    };
    expect(() => validatePrototypeStructureDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects an invalid element kind", () => {
    const draft = {
      ...validStructure,
      sections: [{ ...validStructure.sections[0], elements: [{ ...validStructure.sections[0].elements[0], kind: "widget" }] }],
    };
    expect(() => validatePrototypeStructureDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects malformed input entirely", () => {
    expect(() => validatePrototypeStructureDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });
});

describe("validatePrototypeCrossCheckDraft (FR-15 contract enforcement)", () => {
  it("accepts a well-formed draft", () => {
    expect(() => validatePrototypeCrossCheckDraft(validCrossCheck)).not.toThrow();
  });

  it("rejects a mismatch with no source references", () => {
    const draft = { ...validCrossCheck, mismatches: [{ ...validCrossCheck.mismatches[0], sourceRefs: [] }] };
    expect(() => validatePrototypeCrossCheckDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("accepts zero mismatches alongside notCheckable entries", () => {
    const draft = {
      mismatches: [],
      notCheckable: [{ section: "Empty state", reason: "BRD doesn't describe the empty-cart state." }],
    };
    const result = validatePrototypeCrossCheckDraft(draft);
    expect(result.mismatches).toHaveLength(0);
    expect(result.notCheckable).toHaveLength(1);
  });

  it("rejects malformed input entirely", () => {
    expect(() => validatePrototypeCrossCheckDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });
});
