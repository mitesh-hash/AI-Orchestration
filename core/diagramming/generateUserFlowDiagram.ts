import { checkBrdContentInput } from "../guardrails/inputCheck";
import { validateUserFlowDiagramDraft } from "../guardrails/diagramValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { USER_FLOW_DIAGRAM_TOOL_JSON_SCHEMA, type UserFlowDiagramDraft } from "../llm/schemas";
import {
  USER_FLOW_DIAGRAM_SYSTEM_PROMPT,
  buildUserFlowDiagramUserPrompt,
} from "../llm/prompts";
import type { BrdContent } from "../documentation/brdContent";

export type GenerateDiagramResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: UserFlowDiagramDraft };

// FR-10: derives a User Flow diagram from an existing BRD's content (same
// source pattern as FR-7's Product Discovery tickets, not a fresh paste --
// confirmed with the user). Every node cites the BRD text it came from; a
// part of the process the BRD doesn't describe becomes a gap instead of an
// invented step or branch.
export async function generateUserFlowDiagram(
  brd: BrdContent
): Promise<GenerateDiagramResult> {
  const inputCheck = checkBrdContentInput(brd, "draw a user flow from");
  if (!inputCheck.ok) {
    return { status: "insufficient_input", reason: inputCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: USER_FLOW_DIAGRAM_SYSTEM_PROMPT,
    userPrompt: buildUserFlowDiagramUserPrompt(brd.title, brd.sections),
    toolName: "submit_user_flow_diagram",
    toolDescription: "Submit the drafted User Flow diagram graph and any flagged gaps.",
    inputSchema: USER_FLOW_DIAGRAM_TOOL_JSON_SCHEMA,
  });

  const draft = validateUserFlowDiagramDraft(rawOutput);
  return { status: "generated", draft };
}
