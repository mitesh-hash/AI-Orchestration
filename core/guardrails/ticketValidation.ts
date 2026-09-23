import {
  ProductDiscoveryTicketsDraftSchema,
  type ProductDiscoveryTicketsDraft,
} from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Same purpose as validateBrdDraft: one clearly-labeled error for "the model
// didn't honor the per-ticket citation contract" (FR-7's traceability back
// to the BRD), instead of a raw ZodError leaking out of the generation
// module.
export function validateTicketsDraft(rawInput: unknown): ProductDiscoveryTicketsDraft {
  const result = ProductDiscoveryTicketsDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated tickets failed the citation/gap contract: ${result.error.message}`
    );
  }
  return result.data;
}
