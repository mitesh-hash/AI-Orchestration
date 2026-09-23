import { checkTranscriptInput } from "../guardrails/inputCheck";
import { validateBrdDraft } from "../guardrails/brdValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { BRD_TOOL_JSON_SCHEMA, type BrdDraft } from "../llm/schemas";
import { BRD_SYSTEM_PROMPT, buildBrdUserPrompt } from "../llm/prompts";

export type GenerateBrdResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: BrdDraft };

// FR-1/FR-2/FR-5: turns one transcript into a first-draft BRD where every
// section cites its source and anything uncovered is a flagged gap, not
// invented text. Never calls the LLM on input that fails the guardrail
// check in core/guardrails/inputCheck.ts.
export async function generateBrd(
  transcriptText: string,
  meetingDate: Date
): Promise<GenerateBrdResult> {
  const inputCheck = checkTranscriptInput(transcriptText);
  if (!inputCheck.ok) {
    return { status: "insufficient_input", reason: inputCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: BRD_SYSTEM_PROMPT,
    userPrompt: buildBrdUserPrompt(
      transcriptText,
      meetingDate.toISOString().slice(0, 10)
    ),
    toolName: "submit_brd_draft",
    toolDescription: "Submit the drafted BRD sections and any flagged gaps.",
    inputSchema: BRD_TOOL_JSON_SCHEMA,
  });

  const draft = validateBrdDraft(rawOutput);
  return { status: "generated", draft };
}
