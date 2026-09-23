import { WireframeOptionsDraftSchema, type WireframeOptionsDraft } from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Same purpose as validateTicketsDraft: one clearly-labeled error for "the
// model didn't honor the wireframe contract" -- every region must cite the
// BRD or design-system notes it was grounded in (FR-11).
export function validateWireframeOptionsDraft(rawInput: unknown): WireframeOptionsDraft {
  const result = WireframeOptionsDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated wireframe options failed the citation/gap contract: ${result.error.message}`
    );
  }
  return result.data;
}
