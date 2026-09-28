import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateFrd } from "@/core/documentation/generateFrd";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const mockedCall = vi.mocked(callStructuredTool);

const SAMPLE_BRD = {
  title: "Checkout redesign BRD",
  sections: [
    {
      heading: "Problem Statement",
      text: "Checkout abandonment is high because shipping cost is hidden.",
      sourceRefs: [{ quoteOrParaphrase: "users can't see shipping cost until the final step" }],
    },
  ],
};

beforeEach(() => {
  mockedCall.mockReset();
});

describe("generateFrd (FR-3)", () => {
  it("returns insufficient_input without calling the LLM when the BRD has no sections", async () => {
    const result = await generateFrd({
      brd: { title: "Empty", sections: [] },
      diagram: null,
      wireframes: null,
      devSpec: null,
    });
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns a validated draft when only the BRD is available, flagging the rest as gaps", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout redesign FRD",
      sections: [
        {
          heading: "Problem Statement",
          text: "Checkout abandonment is high because shipping cost is hidden.",
          sourceRefs: [{ quoteOrParaphrase: "users can't see shipping cost until the final step" }],
        },
      ],
      gaps: [
        { section: "User Flow", reason: "No diagram has been generated yet." },
        { section: "Wireframes", reason: "No wireframe options have been generated yet." },
        { section: "Developer Spec", reason: "No developer spec has been generated yet." },
      ],
    });

    const result = await generateFrd({
      brd: SAMPLE_BRD,
      diagram: null,
      wireframes: null,
      devSpec: null,
    });

    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.sections).toHaveLength(1);
      expect(result.draft.gaps).toHaveLength(3);
    }
  });

  it("returns a validated draft grounded in all sources when everything is available", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout redesign FRD",
      sections: [
        {
          heading: "User Flow",
          text: "The user proceeds from cart to shipping to payment.",
          sourceRefs: [{ quoteOrParaphrase: "cart -> shipping -> payment" }],
        },
      ],
      gaps: [],
    });

    const result = await generateFrd({
      brd: SAMPLE_BRD,
      diagram: {
        title: "Checkout flow",
        nodes: [
          {
            id: "cart",
            label: "Cart",
            type: "start",
            sourceRefs: [{ quoteOrParaphrase: "cart -> shipping -> payment" }],
          },
        ],
        edges: [],
      },
      wireframes: {
        options: [
          {
            name: "Option A",
            regions: [
              {
                label: "Primary CTA button",
                kind: "button",
                sourceRefs: [{ quoteOrParaphrase: "cart -> shipping -> payment" }],
              },
            ],
          },
        ],
      },
      devSpec: { rules: [], gaps: [] },
    });

    expect(result.status).toBe("generated");
    expect(mockedCall).toHaveBeenCalledTimes(1);
  });

  it("throws a GuardrailViolationError instead of returning ungrounded content", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout redesign FRD",
      sections: [
        {
          heading: "Problem Statement",
          text: "Some claim with nothing backing it.",
          sourceRefs: [], // violates the citation contract
        },
      ],
      gaps: [],
    });

    await expect(
      generateFrd({ brd: SAMPLE_BRD, diagram: null, wireframes: null, devSpec: null })
    ).rejects.toThrow(GuardrailViolationError);
  });
});
