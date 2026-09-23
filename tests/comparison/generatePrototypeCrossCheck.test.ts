import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generatePrototypeCrossCheck } from "@/core/comparison/generatePrototypeCrossCheck";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const mockedCall = vi.mocked(callStructuredTool);

beforeEach(() => {
  mockedCall.mockReset();
});

const sampleBrd = {
  title: "Checkout redesign BRD",
  sections: [
    {
      heading: "Problem Statement",
      text: "The primary button should read 'Add to cart'.",
      sourceRefs: [{ quoteOrParaphrase: "button should read 'Add to cart'" }],
    },
  ],
};

const samplePrototype = {
  title: "Checkout prototype",
  sections: [
    {
      name: "Cart summary",
      elements: [
        {
          kind: "button" as const,
          label: "Add to Bag",
          sourceRefs: [{ quoteOrParaphrase: "<button>Add to Bag</button>" }],
        },
      ],
    },
  ],
};

describe("generatePrototypeCrossCheck (FR-15)", () => {
  it("returns insufficient_input without calling the LLM when the BRD has no sections", async () => {
    const result = await generatePrototypeCrossCheck({ title: "Empty", sections: [] }, samplePrototype);
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns insufficient_input without calling the LLM when the prototype has no sections", async () => {
    const result = await generatePrototypeCrossCheck(sampleBrd, { title: "Empty", sections: [] });
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns validated mismatches when the model responds with a well-formed draft", async () => {
    mockedCall.mockResolvedValue({
      mismatches: [
        {
          topic: "CTA label",
          documented: "BRD says the button should read 'Add to cart'",
          prototypeShows: "Prototype button reads 'Add to Bag'",
          sourceRefs: [{ quoteOrParaphrase: "Add to Bag" }],
        },
      ],
      notCheckable: [],
    });

    const result = await generatePrototypeCrossCheck(sampleBrd, samplePrototype);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.mismatches).toHaveLength(1);
    }
  });

  it("throws a GuardrailViolationError instead of returning an uncited mismatch", async () => {
    mockedCall.mockResolvedValue({
      mismatches: [{ topic: "CTA label", documented: "x", prototypeShows: "y", sourceRefs: [] }],
      notCheckable: [],
    });

    await expect(generatePrototypeCrossCheck(sampleBrd, samplePrototype)).rejects.toThrow(
      GuardrailViolationError
    );
  });
});
