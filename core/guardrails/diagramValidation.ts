import { UserFlowDiagramDraftSchema, type UserFlowDiagramDraft } from "../llm/schemas";
import { GuardrailViolationError } from "./errors";

// Same purpose as validateBrdDraft: one clearly-labeled error for "the
// model didn't honor the diagram contract" (FR-2's citation principle per
// node, FR-5's gaps-not-invention). Adds one check the Zod schema can't
// express on its own: every edge must connect two nodes that were actually
// declared, so a rendered diagram can never have a dangling connection.
export function validateUserFlowDiagramDraft(rawInput: unknown): UserFlowDiagramDraft {
  const result = UserFlowDiagramDraftSchema.safeParse(rawInput);
  if (!result.success) {
    throw new GuardrailViolationError(
      `Generated diagram failed the citation/gap contract: ${result.error.message}`
    );
  }

  const draft = result.data;
  const nodeIds = new Set(draft.nodes.map((n) => n.id));
  for (const edge of draft.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new GuardrailViolationError(
        `Generated diagram has an edge (${edge.from} -> ${edge.to}) referencing a node that was never declared.`
      );
    }
  }

  return draft;
}
