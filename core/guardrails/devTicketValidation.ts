import {
  DevelopmentTicketsDraftSchema,
  type DevelopmentTicketsDraft,
} from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Same purpose as validateTicketsDraft, for the FR-8 development-ticket
// contract: every ticket must cite the pasted spec/design text it was
// drawn from.
export function validateDevTicketsDraft(rawInput: unknown): DevelopmentTicketsDraft {
  const result = DevelopmentTicketsDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated development tickets failed the citation/gap contract: ${result.error.message}`
    );
  }
  return result.data;
}
