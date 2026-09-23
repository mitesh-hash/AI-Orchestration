import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateComparison } from "@/core/comparison/generateComparison";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const mockedCall = vi.mocked(callStructuredTool);

beforeEach(() => {
  mockedCall.mockReset();
});

const longEnoughText =
  "This is a reasonably long piece of text describing version A or B of a document, well past the minimum length.";

describe("generateComparison (FR-12/13)", () => {
  it("returns insufficient_input without calling the LLM when version A is empty", async () => {
    const result = await generateComparison("A", "", "B", longEnoughText);
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns insufficient_input without calling the LLM when version B is empty", async () => {
    const result = await generateComparison("A", longEnoughText, "B", "");
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns validated rows when the model responds with a well-formed draft", async () => {
    mockedCall.mockResolvedValue({
      rows: [
        {
          topic: "Return window",
          aSummary: "30 days",
          bSummary: "60 days",
          isConflict: true,
          sourceRefs: [{ quoteOrParaphrase: "within 30 days" }],
        },
      ],
    });

    const result = await generateComparison("Draft 1", longEnoughText, "Draft 2", longEnoughText);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.rows).toHaveLength(1);
      expect(result.draft.rows[0].isConflict).toBe(true);
    }
  });

  it("throws a GuardrailViolationError for a degenerate conflict row", async () => {
    mockedCall.mockResolvedValue({
      rows: [
        {
          topic: "Return window",
          aSummary: "30 days",
          bSummary: "30 days",
          isConflict: true,
          sourceRefs: [{ quoteOrParaphrase: "within 30 days" }],
        },
      ],
    });

    await expect(
      generateComparison("Draft 1", longEnoughText, "Draft 2", longEnoughText)
    ).rejects.toThrow(GuardrailViolationError);
  });
});
