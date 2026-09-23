import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateUserFlowDiagram } from "@/core/diagramming/generateUserFlowDiagram";
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
      text: "Users add items to cart, then see shipping cost only at the final step.",
      sourceRefs: [{ quoteOrParaphrase: "shipping cost only at the final step" }],
    },
  ],
};

describe("generateUserFlowDiagram (FR-10)", () => {
  it("returns insufficient_input without calling the LLM when the BRD has no sections", async () => {
    const result = await generateUserFlowDiagram({ title: "Empty BRD", sections: [] });
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns a validated diagram when the model responds with a well-formed graph", async () => {
    mockedCall.mockResolvedValue({
      title: "Cart checkout flow",
      nodes: [
        { id: "start", label: "Add items to cart", type: "start", sourceRefs: [{ quoteOrParaphrase: "add items to cart" }] },
        { id: "end", label: "See shipping cost", type: "end", sourceRefs: [{ quoteOrParaphrase: "shipping cost only at the final step" }] },
      ],
      edges: [{ from: "start", to: "end" }],
      gaps: [{ section: "Failure path", reason: "BRD doesn't describe what happens if shipping is unavailable." }],
    });

    const result = await generateUserFlowDiagram(sampleBrd);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.nodes).toHaveLength(2);
      expect(result.draft.edges).toHaveLength(1);
      expect(result.draft.gaps).toHaveLength(1);
    }
  });

  it("throws a GuardrailViolationError instead of returning a dangling edge", async () => {
    mockedCall.mockResolvedValue({
      title: "Cart checkout flow",
      nodes: [
        { id: "start", label: "Add items to cart", type: "start", sourceRefs: [{ quoteOrParaphrase: "add items to cart" }] },
      ],
      edges: [{ from: "start", to: "ghost-node" }],
      gaps: [],
    });

    await expect(generateUserFlowDiagram(sampleBrd)).rejects.toThrow(GuardrailViolationError);
  });
});
