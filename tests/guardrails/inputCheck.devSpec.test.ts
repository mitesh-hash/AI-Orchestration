import { describe, expect, it } from "vitest";
import { checkDevSpecInput, checkTranscriptInput } from "@/core/guardrails/inputCheck";

describe("checkDevSpecInput (FR-8 input guardrail)", () => {
  it("rejects empty input with an explicit, spec-specific reason", () => {
    const result = checkDevSpecInput("");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no developer spec \/ design notes text/i);
  });

  it("rejects input below the minimum usable length", () => {
    const result = checkDevSpecInput("too short");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/too short/i);
  });

  it("accepts a reasonably sized spec note", () => {
    const result = checkDevSpecInput(
      "The cart API must reject updates missing a shipping estimate before checkout."
    );
    expect(result.ok).toBe(true);
  });
});

describe("checkTranscriptInput regression after the shared-helper refactor", () => {
  it("still rejects empty input with a transcript-specific reason", () => {
    const result = checkTranscriptInput("");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no transcript text/i);
  });

  it("still rejects short input with a transcript-specific reason", () => {
    const result = checkTranscriptInput("too short");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/transcript.*too short/i);
  });
});
