import { DevSpecDraftSchema, type DevSpecDraft } from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Same purpose as the other validate*Draft guardrails: one clearly-labeled
// error for "the model didn't honor the contract" (FR-16's citation
// requirement, FR-17's needsConfirmation flag) instead of a raw ZodError.
export function validateDevSpecDraft(rawInput: unknown): DevSpecDraft {
  const result = DevSpecDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated developer spec failed the citation/confirmation contract: ${result.error.message}`
    );
  }
  return result.data;
}
