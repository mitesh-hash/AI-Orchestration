import { checkBrdContentInput, checkPrototypeStructureInput } from "../guardrails/inputCheck";
import { validateDevSpecDraft } from "../guardrails/devSpecValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { DEV_SPEC_TOOL_JSON_SCHEMA, type DevSpecDraft } from "../llm/schemas";
import { DEV_SPEC_SYSTEM_PROMPT, buildDevSpecUserPrompt } from "../llm/prompts";
import type { BrdContent } from "../documentation/brdContent";
import type { PrototypeContent } from "../comparison/prototypeContent";

export type GenerateDevSpecResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: DevSpecDraft };

// FR-16/17: drafts validations, business rules, and error/success messages
// from the BRD (feature description) and an already-extracted prototype
// structure (frozen prototype, FR-14) -- the same two inputs FR-16 names,
// already available from earlier slices rather than a third new input
// mechanism. Every rule either cites an explicit statement in one of the
// two sources (needsConfirmation: false) or is flagged needsConfirmation
// (FR-17) -- never presented as settled without that flag.
export async function generateDevSpec(
  brd: BrdContent,
  prototype: PrototypeContent
): Promise<GenerateDevSpecResult> {
  const brdCheck = checkBrdContentInput(brd, "draft developer specs from");
  if (!brdCheck.ok) {
    return { status: "insufficient_input", reason: brdCheck.reason ?? "Input rejected." };
  }
  const prototypeCheck = checkPrototypeStructureInput(prototype, "draft developer specs from");
  if (!prototypeCheck.ok) {
    return { status: "insufficient_input", reason: prototypeCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: DEV_SPEC_SYSTEM_PROMPT,
    userPrompt: buildDevSpecUserPrompt(brd.title, brd.sections, prototype.title, prototype.sections),
    toolName: "submit_dev_spec",
    toolDescription: "Submit the drafted developer spec rules and any flagged gaps.",
    inputSchema: DEV_SPEC_TOOL_JSON_SCHEMA,
  });

  return { status: "generated", draft: validateDevSpecDraft(rawOutput) };
}
