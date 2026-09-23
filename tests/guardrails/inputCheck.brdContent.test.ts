import { describe, expect, it } from "vitest";
import { checkBrdContentInput } from "@/core/guardrails/inputCheck";

describe("checkBrdContentInput (FR-7 input guardrail)", () => {
  it("rejects a null BRD", () => {
    const result = checkBrdContentInput(null);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no sections/i);
  });

  it("rejects a BRD with zero sections", () => {
    const result = checkBrdContentInput({ sections: [] });
    expect(result.ok).toBe(false);
  });

  it("accepts a BRD with at least one section", () => {
    const result = checkBrdContentInput({ sections: [{ heading: "Problem Statement" }] });
    expect(result.ok).toBe(true);
  });
});
