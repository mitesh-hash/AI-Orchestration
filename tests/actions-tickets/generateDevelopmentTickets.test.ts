import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateDevelopmentTickets } from "@/core/actions-tickets/generateDevelopmentTickets";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const mockedCall = vi.mocked(callStructuredTool);

beforeEach(() => {
  mockedCall.mockReset();
});

const sampleSpecText =
  "The cart API must reject updates missing a shipping estimate before checkout. Error message: 'Shipping estimate required.'";

describe("generateDevelopmentTickets (FR-8)", () => {
  it("returns insufficient_input without calling the LLM when the spec text is empty", async () => {
    const result = await generateDevelopmentTickets("");
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns validated tickets when the model responds with a well-formed draft", async () => {
    mockedCall.mockResolvedValue({
      tickets: [
        {
          title: "Add shipping estimate validation to cart API",
          description: "Reject cart updates missing a shipping estimate, returning 'Shipping estimate required.'",
          sourceRefs: [{ quoteOrParaphrase: "must reject updates missing a shipping estimate" }],
        },
      ],
      gaps: [{ section: "Retry behavior", reason: "Spec notes don't say what happens on retry." }],
    });

    const result = await generateDevelopmentTickets(sampleSpecText);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].title).toMatch(/shipping estimate/i);
      expect(result.gaps).toHaveLength(1);
    }
  });

  it("throws a GuardrailViolationError instead of returning an uncited ticket", async () => {
    mockedCall.mockResolvedValue({
      tickets: [
        {
          title: "Some invented validation",
          description: "Not actually grounded in the spec notes.",
          sourceRefs: [],
        },
      ],
      gaps: [],
    });

    await expect(generateDevelopmentTickets(sampleSpecText)).rejects.toThrow(
      GuardrailViolationError
    );
  });
});
