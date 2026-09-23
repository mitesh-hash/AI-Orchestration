import { checkNonEmptyText } from "../guardrails/inputCheck";
import { validatePrototypeStructureDraft } from "../guardrails/prototypeValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { PROTOTYPE_STRUCTURE_TOOL_JSON_SCHEMA, type PrototypeStructureDraft } from "../llm/schemas";
import {
  PROTOTYPE_STRUCTURE_SYSTEM_PROMPT,
  buildPrototypeStructureUserPrompt,
} from "../llm/prompts";

export type GeneratePrototypeStructureResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: PrototypeStructureDraft };

// FR-14: extracts structure from pasted HTML (confirmed with the user --
// paste rather than file upload). Every element cites the actual HTML
// snippet it was extracted from, so the model can't describe UI that isn't
// really in the markup.
export async function generatePrototypeStructure(
  rawHtml: string
): Promise<GeneratePrototypeStructureResult> {
  const inputCheck = checkNonEmptyText(rawHtml, "prototype HTML");
  if (!inputCheck.ok) {
    return { status: "insufficient_input", reason: inputCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: PROTOTYPE_STRUCTURE_SYSTEM_PROMPT,
    userPrompt: buildPrototypeStructureUserPrompt(rawHtml),
    toolName: "submit_prototype_structure",
    toolDescription: "Submit the extracted prototype structure.",
    inputSchema: PROTOTYPE_STRUCTURE_TOOL_JSON_SCHEMA,
  });

  return { status: "generated", draft: validatePrototypeStructureDraft(rawOutput) };
}
