import { checkBrdContentInput, checkPrototypeStructureInput } from "../guardrails/inputCheck";
import { validatePrototypeCrossCheckDraft } from "../guardrails/prototypeValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { PROTOTYPE_CROSS_CHECK_TOOL_JSON_SCHEMA, type PrototypeCrossCheckDraft } from "../llm/schemas";
import {
  PROTOTYPE_CROSS_CHECK_SYSTEM_PROMPT,
  buildPrototypeCrossCheckUserPrompt,
} from "../llm/prompts";
import type { BrdContent } from "../documentation/brdContent";
import type { PrototypeContent } from "./prototypeContent";

export type GeneratePrototypeCrossCheckResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: PrototypeCrossCheckDraft };

// FR-15: cross-checks a BRD against an already-extracted prototype
// structure, scoped explicitly to static structure/content -- never a
// claim about runtime behavior static HTML can't demonstrate (see the
// system prompt). A requirement the BRD doesn't state concretely enough to
// check becomes "notCheckable" rather than a guessed pass or fail.
export async function generatePrototypeCrossCheck(
  brd: BrdContent,
  prototype: PrototypeContent
): Promise<GeneratePrototypeCrossCheckResult> {
  const brdCheck = checkBrdContentInput(brd, "cross-check against the prototype");
  if (!brdCheck.ok) {
    return { status: "insufficient_input", reason: brdCheck.reason ?? "Input rejected." };
  }
  const prototypeCheck = checkPrototypeStructureInput(prototype, "cross-check the BRD against");
  if (!prototypeCheck.ok) {
    return { status: "insufficient_input", reason: prototypeCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: PROTOTYPE_CROSS_CHECK_SYSTEM_PROMPT,
    userPrompt: buildPrototypeCrossCheckUserPrompt(
      brd.title,
      brd.sections,
      prototype.title,
      prototype.sections
    ),
    toolName: "submit_prototype_cross_check",
    toolDescription: "Submit the cross-check mismatches and anything not checkable.",
    inputSchema: PROTOTYPE_CROSS_CHECK_TOOL_JSON_SCHEMA,
  });

  return { status: "generated", draft: validatePrototypeCrossCheckDraft(rawOutput) };
}
