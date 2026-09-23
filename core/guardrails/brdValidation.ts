import { BrdDraftSchema, type BrdDraft } from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Wraps the Zod parse so callers get one clearly-labeled error for "the
// model didn't honor the citation/gap contract" (FR-2, FR-5) instead of a
// raw ZodError leaking out of the generation module.
export function validateBrdDraft(rawInput: unknown): BrdDraft {
  const result = BrdDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated BRD failed the citation/gap contract: ${result.error.message}`
    );
  }
  return result.data;
}
