import { BrdDraftSchema, type BrdDraft, type FrdDraft, type PrdDraft } from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Wraps the Zod parse so callers get one clearly-labeled error for "the
// model didn't honor the citation/gap contract" (FR-2, FR-5) instead of a
// raw ZodError leaking out of the generation module. FRD (FR-3) and PRD
// (FR-4) drafts are the exact same shape as a BRD draft (see the schema
// comment in core/llm/schemas.ts), so they reuse this same parse rather
// than duplicating it -- each gets its own thin wrapper only so the error
// message names the right document type.
function validateStructuredDocumentDraft(rawInput: unknown, documentTypeLabel: string): BrdDraft {
  const result = BrdDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated ${documentTypeLabel} failed the citation/gap contract: ${result.error.message}`
    );
  }
  return result.data;
}

export function validateBrdDraft(rawInput: unknown): BrdDraft {
  return validateStructuredDocumentDraft(rawInput, "BRD");
}

export function validateFrdDraft(rawInput: unknown): FrdDraft {
  return validateStructuredDocumentDraft(rawInput, "FRD");
}

export function validatePrdDraft(rawInput: unknown): PrdDraft {
  return validateStructuredDocumentDraft(rawInput, "PRD");
}
