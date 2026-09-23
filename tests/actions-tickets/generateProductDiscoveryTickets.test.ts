import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateProductDiscoveryTickets } from "@/core/actions-tickets/generateProductDiscoveryTickets";
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
      text: "Checkout abandonment is high because shipping cost is hidden.",
      sourceRefs: [{ quoteOrParaphrase: "shipping cost is hidden until the final step" }],
    },
  ],
};

describe("generateProductDiscoveryTickets (FR-7)", () => {
  it("returns insufficient_input without calling the LLM when the BRD has no sections", async () => {
    const result = await generateProductDiscoveryTickets({ title: "Empty BRD", sections: [] });
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns validated tickets when the model responds with a well-formed draft", async () => {
    mockedCall.mockResolvedValue({
      tickets: [
        {
          milestone: "User Journey",
          title: "Surface shipping cost on the cart page",
          description: "Add an estimated shipping cost line to the cart page.",
          sourceRefs: [{ quoteOrParaphrase: "shipping cost is hidden until the final step" }],
        },
      ],
      gaps: [{ section: "Design", reason: "BRD never discusses a design phase." }],
    });

    const result = await generateProductDiscoveryTickets(sampleBrd);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].milestone).toBe("User Journey");
      expect(result.gaps).toHaveLength(1);
    }
  });

  it("throws a GuardrailViolationError instead of returning an uncited ticket", async () => {
    mockedCall.mockResolvedValue({
      tickets: [
        {
          milestone: "Design",
          title: "Some invented ticket",
          description: "Not actually grounded in the BRD.",
          sourceRefs: [],
        },
      ],
      gaps: [],
    });

    await expect(generateProductDiscoveryTickets(sampleBrd)).rejects.toThrow(
      GuardrailViolationError
    );
  });
});
