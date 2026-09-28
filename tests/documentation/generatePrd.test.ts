import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generatePrd } from "@/core/documentation/generatePrd";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const mockedCall = vi.mocked(callStructuredTool);

const SAMPLE_FRD = {
  title: "Checkout redesign FRD",
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

describe("generatePrd (FR-4)", () => {
  it("returns insufficient_input without calling the LLM when the FRD has no sections", async () => {
    const result = await generatePrd({ title: "Empty", sections: [] });
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns a validated draft when the model responds with a well-formed PRD", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout redesign PRD",
      sections: [
        {
          heading: "Problem Statement",
          text: "Customers abandon checkout because shipping cost isn't shown up front.",
          sourceRefs: [{ quoteOrParaphrase: "users can't see shipping cost until the final step" }],
        },
      ],
      gaps: [],
    });

    const result = await generatePrd(SAMPLE_FRD);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.sections).toHaveLength(1);
      expect(mockedCall).toHaveBeenCalledTimes(1);
    }
  });

  it("throws a GuardrailViolationError instead of returning ungrounded content", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout redesign PRD",
      sections: [
        {
          heading: "Problem Statement",
          text: "Some claim with nothing backing it.",
          sourceRefs: [], // violates the citation contract
        },
      ],
      gaps: [],
    });

    await expect(generatePrd(SAMPLE_FRD)).rejects.toThrow(GuardrailViolationError);
  });
});
