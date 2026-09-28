import { checkBrdContentInput } from "../guardrails/inputCheck";
import { validatePrdDraft } from "../guardrails/brdValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { PRD_TOOL_JSON_SCHEMA, type PrdDraft } from "../llm/schemas";
import { PRD_SYSTEM_PROMPT, buildPrdUserPrompt } from "../llm/prompts";
import type { FrdContent } from "./brdContent";

export type GeneratePrdResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: PrdDraft };

// FR-4: rewrites a finalized FRD as a business-facing PRD. Whether the FRD
// is actually "finalized" (approved) is a DB-state check, made by the
// caller (generatePrdAction, which has access to the FRD's approval
// status) before this function is even called -- this function itself just
// guards against empty/malformed FRD content, the same shape check every
// other generator uses.
export async function generatePrd(frd: FrdContent): Promise<GeneratePrdResult> {
  const inputCheck = checkBrdContentInput(frd, "draft a PRD from");
  if (!inputCheck.ok) {
    return { status: "insufficient_input", reason: inputCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: PRD_SYSTEM_PROMPT,
    userPrompt: buildPrdUserPrompt(frd.title, frd.sections),
    toolName: "submit_prd_draft",
    toolDescription: "Submit the drafted PRD sections and any flagged gaps.",
    inputSchema: PRD_TOOL_JSON_SCHEMA,
  });

  return { status: "generated", draft: validatePrdDraft(rawOutput) };
}
