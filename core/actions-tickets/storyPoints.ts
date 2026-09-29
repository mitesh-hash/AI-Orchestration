import { SPEC_DEFINITIONS, COMPLEXITIES, SIZES } from "@/core/llm/schemas";

export type SpecDefinition = (typeof SPEC_DEFINITIONS)[number];
export type Complexity = (typeof COMPLEXITIES)[number];
export type Size = (typeof SIZES)[number];

// Fixed, deterministic lookup: the AI only ever supplies the three
// categorical inputs (validated by the Zod enums in core/llm/schemas.ts),
// never the point value itself. Each axis contributes a "tier" (0 = least
// effort), the tiers sum, and the sum indexes a Fibonacci-like scale --
// the same scale shape agile estimation conventionally uses, just derived
// here instead of asked of the model, so the same three inputs always
// produce the same number and that number is always traceable back to
// this table rather than to model variance.
const FIBONACCI_STORY_POINTS = [1, 2, 3, 5, 8, 13, 21, 34] as const;

const SPEC_DEFINITION_TIER: Record<SpecDefinition, number> = {
  CLEAR: 0,
  BLUR: 1,
  BLIND: 2,
};

const COMPLEXITY_TIER: Record<Complexity, number> = {
  EASY: 0,
  MEDIUM: 1,
  DIFFICULT: 2,
};

const SIZE_TIER: Record<Size, number> = {
  TINY: 0,
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
};

export function getStoryPoints(
  specDefinition: SpecDefinition,
  complexity: Complexity,
  size: Size,
): number {
  const tier =
    SPEC_DEFINITION_TIER[specDefinition] + COMPLEXITY_TIER[complexity] + SIZE_TIER[size];
  const points = FIBONACCI_STORY_POINTS[tier];
  if (points === undefined) {
    throw new Error(`No story-point value defined for tier ${tier}`);
  }
  return points;
}
