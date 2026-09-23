import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateWireframeOptions } from "@/core/diagramming/generateWireframeOptions";
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
      text: "Users need to see shipping cost on the cart page.",
      sourceRefs: [{ quoteOrParaphrase: "shipping cost on the cart page" }],
    },
  ],
};

const sampleDesignSystem =
  "Primary button is a dark blue rounded rect. Cards have 8px radius and a light grey border.";

describe("generateWireframeOptions (FR-11)", () => {
  it("returns insufficient_input without calling the LLM when the BRD has no sections", async () => {
    const result = await generateWireframeOptions({ title: "Empty", sections: [] }, sampleDesignSystem);
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns insufficient_input without calling the LLM when design system notes are empty", async () => {
    const result = await generateWireframeOptions(sampleBrd, "");
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns validated wireframe options when the model responds with a well-formed draft", async () => {
    mockedCall.mockResolvedValue({
      options: [
        {
          name: "Option A: shipping banner",
          regions: [
            {
              label: "Shipping cost banner",
              kind: "content",
              sourceRefs: [{ quoteOrParaphrase: "shipping cost on the cart page" }],
            },
            {
              label: "Primary CTA button (dark blue rounded rect per design system)",
              kind: "button",
              sourceRefs: [{ quoteOrParaphrase: "primary button is a dark blue rounded rect" }],
            },
          ],
        },
      ],
      gaps: [{ section: "Empty cart state", reason: "Neither the BRD nor design notes describe this." }],
    });

    const result = await generateWireframeOptions(sampleBrd, sampleDesignSystem);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.options).toHaveLength(1);
      expect(result.draft.options[0].regions).toHaveLength(2);
      expect(result.draft.gaps).toHaveLength(1);
    }
  });

  it("throws a GuardrailViolationError instead of returning an uncited region", async () => {
    mockedCall.mockResolvedValue({
      options: [
        {
          name: "Option A",
          regions: [{ label: "Some invented region", kind: "custom", sourceRefs: [] }],
        },
      ],
      gaps: [],
    });

    await expect(generateWireframeOptions(sampleBrd, sampleDesignSystem)).rejects.toThrow(
      GuardrailViolationError
    );
  });
});
