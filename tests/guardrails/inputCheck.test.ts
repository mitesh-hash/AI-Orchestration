import { describe, expect, it } from "vitest";
import { checkTranscriptInput } from "@/core/guardrails/inputCheck";

describe("checkTranscriptInput (FR-5 / Reliability)", () => {
  it("rejects empty input with an explicit reason", () => {
    const result = checkTranscriptInput("");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no transcript text/i);
  });

  it("rejects missing input", () => {
    const result = checkTranscriptInput(undefined);
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = checkTranscriptInput("   \n\t  ");
    expect(result.ok).toBe(false);
  });

  it("rejects input below the minimum usable length", () => {
    const result = checkTranscriptInput("too short");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/too short/i);
  });

  it("accepts a reasonably sized transcript", () => {
    const result = checkTranscriptInput(
      "This is a long enough transcript excerpt to be considered usable input."
    );
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
