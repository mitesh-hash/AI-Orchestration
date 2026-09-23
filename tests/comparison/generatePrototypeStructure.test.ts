import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generatePrototypeStructure } from "@/core/comparison/generatePrototypeStructure";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const mockedCall = vi.mocked(callStructuredTool);

beforeEach(() => {
  mockedCall.mockReset();
});

const sampleHtml =
  "<html><body><header>Site</header><button>Add to cart</button></body></html> and quite a bit more markup to be safe";

describe("generatePrototypeStructure (FR-14)", () => {
  it("returns insufficient_input without calling the LLM when the HTML is empty", async () => {
    const result = await generatePrototypeStructure("");
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns a validated structure when the model responds with a well-formed draft", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout prototype",
      sections: [
        {
          name: "Cart summary",
          elements: [
            {
              kind: "button",
              label: "Add to cart",
              sourceRefs: [{ quoteOrParaphrase: "<button>Add to cart</button>" }],
            },
          ],
        },
      ],
    });

    const result = await generatePrototypeStructure(sampleHtml);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.sections).toHaveLength(1);
      expect(result.draft.sections[0].elements[0].label).toBe("Add to cart");
    }
  });

  it("throws a GuardrailViolationError instead of returning an uncited element", async () => {
    mockedCall.mockResolvedValue({
      title: "Checkout prototype",
      sections: [{ name: "Cart summary", elements: [{ kind: "button", label: "Invented button", sourceRefs: [] }] }],
    });

    await expect(generatePrototypeStructure(sampleHtml)).rejects.toThrow(GuardrailViolationError);
  });
});
