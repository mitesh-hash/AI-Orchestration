import { checkNonEmptyText } from "../guardrails/inputCheck";
import { validateComparisonDraft } from "../guardrails/comparisonValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { COMPARISON_TOOL_JSON_SCHEMA, type ComparisonDraft } from "../llm/schemas";
import { COMPARISON_SYSTEM_PROMPT, buildComparisonUserPrompt } from "../llm/prompts";

export type GenerateComparisonResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: ComparisonDraft };

// FR-12/13: diffs two freely pasted texts (confirmed with the user rather
// than tied to a specific entity type). Every row cites whichever side(s)
// support it, and a genuine contradiction is flagged rather than resolved
// in favor of one side -- see core/guardrails/comparisonValidation.ts for
// the extra check against a degenerate "conflict" between identical text.
export async function generateComparison(
  labelA: string,
  textA: string,
  labelB: string,
  textB: string
): Promise<GenerateComparisonResult> {
  const checkA = checkNonEmptyText(textA, "version A");
  if (!checkA.ok) {
    return { status: "insufficient_input", reason: checkA.reason ?? "Input rejected." };
  }
  const checkB = checkNonEmptyText(textB, "version B");
  if (!checkB.ok) {
    return { status: "insufficient_input", reason: checkB.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: COMPARISON_SYSTEM_PROMPT,
    userPrompt: buildComparisonUserPrompt(labelA, textA, labelB, textB),
    toolName: "submit_comparison",
    toolDescription: "Submit the comparison rows between version A and version B.",
    inputSchema: COMPARISON_TOOL_JSON_SCHEMA,
  });

  return { status: "generated", draft: validateComparisonDraft(rawOutput) };
}
