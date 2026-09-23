import { checkBrdContentInput, checkDesignSystemInput } from "../guardrails/inputCheck";
import { validateWireframeOptionsDraft } from "../guardrails/wireframeValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { WIREFRAME_OPTIONS_TOOL_JSON_SCHEMA, type WireframeOptionsDraft } from "../llm/schemas";
import {
  WIREFRAME_OPTIONS_SYSTEM_PROMPT,
  buildWireframeOptionsUserPrompt,
} from "../llm/prompts";
import type { BrdContent } from "../documentation/brdContent";

export type GenerateWireframesResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: WireframeOptionsDraft };

// FR-11: drafts 2-3 rough wireframe options from an existing BRD (what
// needs to be on screen) and pasted design-system notes (how it should
// look) -- confirmed with the user given no design-system integration or
// image generation exists yet. Every region cites whichever of the two
// sources justified it; anything neither source covers is a gap, not an
// invented visual style.
export async function generateWireframeOptions(
  brd: BrdContent,
  designSystemText: string
): Promise<GenerateWireframesResult> {
  const brdCheck = checkBrdContentInput(brd, "draft wireframes from");
  if (!brdCheck.ok) {
    return { status: "insufficient_input", reason: brdCheck.reason ?? "Input rejected." };
  }
  const designSystemCheck = checkDesignSystemInput(designSystemText);
  if (!designSystemCheck.ok) {
    return { status: "insufficient_input", reason: designSystemCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: WIREFRAME_OPTIONS_SYSTEM_PROMPT,
    userPrompt: buildWireframeOptionsUserPrompt(brd.title, brd.sections, designSystemText),
    toolName: "submit_wireframe_options",
    toolDescription: "Submit the drafted wireframe options and any flagged gaps.",
    inputSchema: WIREFRAME_OPTIONS_TOOL_JSON_SCHEMA,
  });

  const draft = validateWireframeOptionsDraft(rawOutput);
  return { status: "generated", draft };
}
