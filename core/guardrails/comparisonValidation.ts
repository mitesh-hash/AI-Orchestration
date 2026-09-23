import { ComparisonDraftSchema, type ComparisonDraft } from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Same purpose as the other validate*Draft guardrails, plus one semantic
// check the Zod schema can't express: a row marked isConflict must actually
// show two different summaries. A "conflict" between two identical
// summaries would be a degenerate, meaningless flag -- FR-13 is about
// surfacing genuine contradictions, not decorating every row.
export function validateComparisonDraft(rawInput: unknown): ComparisonDraft {
  const result = ComparisonDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated comparison failed the citation contract: ${result.error.message}`
    );
  }

  const draft = result.data;
  for (const row of draft.rows) {
    if (row.isConflict && row.aSummary.trim().toLowerCase() === row.bSummary.trim().toLowerCase()) {
      throw new GuardrailViolationError(
        `Generated comparison flagged a conflict on "${row.topic}" but both sides say the same thing.`
      );
    }
  }

  return draft;
}
