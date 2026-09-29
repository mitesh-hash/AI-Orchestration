import { checkDevSpecInput } from "../guardrails/inputCheck";
import { validateDevTicketsDraft } from "../guardrails/devTicketValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { DEVELOPMENT_TICKETS_TOOL_JSON_SCHEMA, type DevTicketDraft, type Gap } from "../llm/schemas";
import {
  DEVELOPMENT_TICKETS_SYSTEM_PROMPT,
  buildDevelopmentTicketsUserPrompt,
} from "../llm/prompts";
import { getStoryPoints } from "./storyPoints";

// storyPoints is never part of the model-facing schema -- it's always
// computed from the ticket's own specDefinition/complexity/size by
// getStoryPoints() below, so it's added here rather than in DevTicketDraft.
export type DevTicketDraftWithPoints = DevTicketDraft & { storyPoints: number };

export type GenerateDevTicketsResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; tickets: DevTicketDraftWithPoints[]; gaps: Gap[] };

// FR-8: drafts development/technical tickets from pasted "signed-off design
// and developer specs" text (there's no FR-11/FR-16 output to read yet, so
// a BA pastes this directly -- see core/db/devSpecNoteRepository.ts). Kept
// entirely separate from generateProductDiscoveryTickets: different input,
// different prompt, no milestone concept, and the two are never mixed in
// the same ticket set.
export async function generateDevelopmentTickets(
  specText: string
): Promise<GenerateDevTicketsResult> {
  const inputCheck = checkDevSpecInput(specText);
  if (!inputCheck.ok) {
    return { status: "insufficient_input", reason: inputCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: DEVELOPMENT_TICKETS_SYSTEM_PROMPT,
    userPrompt: buildDevelopmentTicketsUserPrompt(specText),
    toolName: "submit_development_tickets",
    toolDescription: "Submit the drafted development/technical tickets and any flagged gaps.",
    inputSchema: DEVELOPMENT_TICKETS_TOOL_JSON_SCHEMA,
  });

  const draft = validateDevTicketsDraft(rawOutput);
  const tickets = draft.tickets.map((ticket) => ({
    ...ticket,
    storyPoints: getStoryPoints(ticket.specDefinition, ticket.complexity, ticket.size),
  }));
  return { status: "generated", tickets, gaps: draft.gaps };
}
