import { checkTranscriptInput } from "../guardrails/inputCheck";
import { validateActionItemsDraft } from "../guardrails/actionItemsValidation";
import { normalizeOwner } from "../guardrails/ownerNormalization";
import { callStructuredTool } from "../llm/generateStructured";
import { ACTION_ITEMS_TOOL_JSON_SCHEMA } from "../llm/schemas";
import {
  ACTION_ITEMS_SYSTEM_PROMPT,
  buildActionItemsUserPrompt,
} from "../llm/prompts";

export interface ExtractedActionItem {
  description: string;
  // Always a display-ready value: either the stated name or the literal
  // "Owner not specified" string, never null and never guessed.
  owner: string;
  deadline: string | null;
  sourceQuote: string;
}

export type ExtractActionItemsResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "extracted"; items: ExtractedActionItem[] };

// FR-6: extracts action items from one transcript, normalizing missing
// owners to an explicit label rather than leaving them blank or inventing
// one.
export async function extractActionItems(
  transcriptText: string
): Promise<ExtractActionItemsResult> {
  const inputCheck = checkTranscriptInput(transcriptText);
  if (!inputCheck.ok) {
    return { status: "insufficient_input", reason: inputCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: ACTION_ITEMS_SYSTEM_PROMPT,
    userPrompt: buildActionItemsUserPrompt(transcriptText),
    toolName: "submit_action_items",
    toolDescription: "Submit the extracted action items.",
    inputSchema: ACTION_ITEMS_TOOL_JSON_SCHEMA,
  });

  const draft = validateActionItemsDraft(rawOutput);
  const items: ExtractedActionItem[] = draft.items.map((item) => ({
    description: item.description,
    owner: normalizeOwner(item.owner),
    deadline: item.deadline,
    sourceQuote: item.sourceQuote,
  }));

  return { status: "extracted", items };
}
