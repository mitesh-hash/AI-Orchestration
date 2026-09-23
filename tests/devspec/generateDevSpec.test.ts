import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/llm/generateStructured", () => ({
  callStructuredTool: vi.fn(),
}));

import { callStructuredTool } from "@/core/llm/generateStructured";
import { generateDevSpec } from "@/core/devspec/generateDevSpec";
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
      text: "The email field must be validated before the user can submit the form.",
      sourceRefs: [{ quoteOrParaphrase: "email field must be validated" }],
    },
  ],
};

const samplePrototype = {
  title: "Checkout prototype",
  sections: [
    {
      name: "Checkout form",
      elements: [
        {
          kind: "input" as const,
          label: "Email",
          details: "type=email",
          sourceRefs: [{ quoteOrParaphrase: '<input type="email">' }],
        },
      ],
    },
  ],
};

describe("generateDevSpec (FR-16/17)", () => {
  it("returns insufficient_input without calling the LLM when the BRD has no sections", async () => {
    const result = await generateDevSpec({ title: "Empty", sections: [] }, samplePrototype);
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns insufficient_input without calling the LLM when the prototype has no sections", async () => {
    const result = await generateDevSpec(sampleBrd, { title: "Empty", sections: [] });
    expect(result.status).toBe("insufficient_input");
    expect(mockedCall).not.toHaveBeenCalled();
  });

  it("returns validated rules when the model responds with a well-formed draft", async () => {
    mockedCall.mockResolvedValue({
      rules: [
        {
          type: "validation",
          description: "Email field must match a valid email format",
          needsConfirmation: false,
          sourceRefs: [{ quoteOrParaphrase: "email field must be validated" }],
        },
      ],
      gaps: [],
    });

    const result = await generateDevSpec(sampleBrd, samplePrototype);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.draft.rules).toHaveLength(1);
      expect(result.draft.rules[0].needsConfirmation).toBe(false);
    }
  });

  it("throws a GuardrailViolationError instead of returning an uncited rule", async () => {
    mockedCall.mockResolvedValue({
      rules: [
        {
          type: "validation",
          description: "Some invented validation",
          needsConfirmation: true,
          sourceRefs: [],
        },
      ],
      gaps: [],
    });

    await expect(generateDevSpec(sampleBrd, samplePrototype)).rejects.toThrow(
      GuardrailViolationError
    );
  });
});
