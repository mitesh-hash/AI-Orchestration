import { describe, expect, it } from "vitest";
import { getStoryPoints } from "@/core/actions-tickets/storyPoints";
import { SPEC_DEFINITIONS, COMPLEXITIES, SIZES } from "@/core/llm/schemas";

describe("getStoryPoints (deterministic story-point matrix)", () => {
  it("returns the lowest value for the easiest possible ticket", () => {
    expect(getStoryPoints("CLEAR", "EASY", "TINY")).toBe(1);
  });

  it("returns the highest value for the hardest possible ticket", () => {
    expect(getStoryPoints("BLIND", "DIFFICULT", "LARGE")).toBe(34);
  });

  it("increases monotonically as any single axis gets harder", () => {
    expect(getStoryPoints("BLUR", "EASY", "TINY")).toBeGreaterThan(
      getStoryPoints("CLEAR", "EASY", "TINY")
    );
    expect(getStoryPoints("CLEAR", "MEDIUM", "TINY")).toBeGreaterThan(
      getStoryPoints("CLEAR", "EASY", "TINY")
    );
    expect(getStoryPoints("CLEAR", "EASY", "SMALL")).toBeGreaterThan(
      getStoryPoints("CLEAR", "EASY", "TINY")
    );
  });

  it("is a pure function of its three inputs -- same inputs, same output, every time", () => {
    for (const specDefinition of SPEC_DEFINITIONS) {
      for (const complexity of COMPLEXITIES) {
        for (const size of SIZES) {
          const first = getStoryPoints(specDefinition, complexity, size);
          const second = getStoryPoints(specDefinition, complexity, size);
          expect(second).toBe(first);
          expect(Number.isInteger(first)).toBe(true);
        }
      }
    }
  });
});
