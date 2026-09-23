import { ActionItemsDraftSchema, type ActionItemsDraft } from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Same purpose as validateBrdDraft, for the action-item extraction contract
// (FR-6: owner is either the stated name or explicitly null, never guessed).
export function validateActionItemsDraft(rawInput: unknown): ActionItemsDraft {
  const result = ActionItemsDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated action items failed the contract: ${result.error.message}`
    );
  }
  return result.data;
}
