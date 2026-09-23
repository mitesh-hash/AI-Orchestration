import {
  PrototypeStructureDraftSchema,
  PrototypeCrossCheckDraftSchema,
  type PrototypeStructureDraft,
  type PrototypeCrossCheckDraft,
} from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// FR-14 contract: every extracted element must cite the HTML snippet it
// came from (enforced by the schema); this just gives that failure a
// clearly-labeled error type instead of a raw ZodError.
export function validatePrototypeStructureDraft(rawInput: unknown): PrototypeStructureDraft {
  const result = PrototypeStructureDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated prototype structure failed the citation contract: ${result.error.message}`
    );
  }
  return result.data;
}

// FR-15 contract: every mismatch cites both sides; the "no runtime
// behavior claims" rule lives in the prompt (there's no schema field for
// it to leak through even if the model tried).
export function validatePrototypeCrossCheckDraft(rawInput: unknown): PrototypeCrossCheckDraft {
  const result = PrototypeCrossCheckDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated prototype cross-check failed the citation contract: ${result.error.message}`
    );
  }
  return result.data;
}
