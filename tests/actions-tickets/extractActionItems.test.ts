import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { extractActionItems } from "@/core/actions-tickets/extractActionItems";
import { UNSPECIFIED_OWNER } from "@/core/guardrails/ownerNormalization";
import { SAMPLE_TRANSCRIPT } from "../fixtures/sampleTranscript";

const mockedCall = vi.mocked(callStructuredTool);

beforeEach(() => {
  mockedCall.mockReset();
});

describe("extractActionItems (FR-6)", () => {
  it("returns insufficient_input without calling the LLM when the transcript is empty", async () => {
    const result = await extractActionItems("   ");
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("keeps a stated owner as-is", async () => {
    mockedCall.mockResolvedValue({
      items: [
        {
          description: "Write up the BRD",
          owner: "Raj",
          deadline: "Friday",
          sourceQuote: "Raj, can you own writing up the BRD and get it to me by Friday?",
        },
      ],
    });

    const result = await extractActionItems(SAMPLE_TRANSCRIPT);
    expect(result.status).toBe("extracted");
    if (result.status === "extracted") {
      expect(result.items[0].owner).toBe("Raj");
      expect(result.items[0].deadline).toBe("Friday");
    }
  });

  it("normalizes a null owner to the explicit 'Owner not specified' label", async () => {
    mockedCall.mockResolvedValue({
      items: [
        {
          description: "Loop in the design team about wireframes",
          owner: null,
          deadline: null,
          sourceQuote: "someone needs to loop in the design team about wireframes",
        },
      ],
    });

    const result = await extractActionItems(SAMPLE_TRANSCRIPT);
    expect(result.status).toBe("extracted");
    if (result.status === "extracted") {
      expect(result.items[0].owner).toBe(UNSPECIFIED_OWNER);
      expect(result.items[0].deadline).toBeNull();
    }
  });
});
