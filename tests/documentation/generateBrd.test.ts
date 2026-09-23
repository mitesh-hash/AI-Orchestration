import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateBrd } from "@/core/documentation/generateBrd";
import { GuardrailViolationError } from "@/core/guardrails/errors";
import { SAMPLE_TRANSCRIPT } from "../fixtures/sampleTranscript";

const mockedCall = vi.mocked(callStructuredTool);

beforeEach(() => {
  mockedCall.mockReset();
});

describe("generateBrd (FR-1 / FR-2 / FR-5)", () => {
  it("returns insufficient_input without calling the LLM when the transcript is empty", async () => {
    const result = await generateBrd("", new Date("2026-09-10"));
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns a validated draft when the model responds with a well-formed BRD", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout redesign BRD",
      sections: [
        {
          heading: "Problem Statement",
          text: "Checkout abandonment is high because shipping cost is hidden.",
          sourceRefs: [{ quoteOrParaphrase: "users can't see shipping cost until the final step" }],
        },
      ],
      gaps: [{ section: "Success Metrics", reason: "Not discussed in this transcript." }],
    });

    const result = await generateBrd(SAMPLE_TRANSCRIPT, new Date("2026-09-10"));
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.sections).toHaveLength(1);
      expect(result.draft.sections[0].sourceRefs).toHaveLength(1);
      expect(result.draft.gaps).toHaveLength(1);
    }
  });

  it("throws a GuardrailViolationError instead of returning ungrounded content", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout redesign BRD",
      sections: [
        {
          heading: "Problem Statement",
          text: "Some claim with nothing backing it.",
          sourceRefs: [], // violates the citation contract
        },
      ],
      gaps: [],
    });

    await expect(generateBrd(SAMPLE_TRANSCRIPT, new Date("2026-09-10"))).rejects.toThrow(
      GuardrailViolationError
    );
  });
});
