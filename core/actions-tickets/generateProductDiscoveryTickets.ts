import { checkBrdContentInput } from "../guardrails/inputCheck";
import { validateTicketsDraft } from "../guardrails/ticketValidation";
import { callStructuredTool } from "../llm/generateStructured";
import {
  PRODUCT_DISCOVERY_TICKETS_TOOL_JSON_SCHEMA,
  type TicketDraft,
  type Gap,
} from "../llm/schemas";
import {
  PRODUCT_DISCOVERY_TICKETS_SYSTEM_PROMPT,
  buildProductDiscoveryTicketsUserPrompt,
} from "../llm/prompts";

export interface BrdContentForTicketing {
  title: string;
  sections: { heading: string; text: string }[];
}

export type GenerateTicketsResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; tickets: TicketDraft[]; gaps: Gap[] };

// FR-7: drafts Product Discovery tickets (User Journey / Design / FRD
// milestones) from an already-generated BRD, never from the raw transcript
// directly. A milestone the BRD can't ground a real ticket for shows up as
// a gap instead of a vague, invented ticket (same no-fabrication principle
// as generateBrd, applied one level further down the chain).
export async function generateProductDiscoveryTickets(
  brd: BrdContentForTicketing
): Promise<GenerateTicketsResult> {
  const inputCheck = checkBrdContentInput(brd);
  if (!inputCheck.ok) {
    return { status: "insufficient_input", reason: inputCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: PRODUCT_DISCOVERY_TICKETS_SYSTEM_PROMPT,
    userPrompt: buildProductDiscoveryTicketsUserPrompt(brd.title, brd.sections),
    toolName: "submit_product_discovery_tickets",
    toolDescription: "Submit the drafted Product Discovery tickets and any flagged gaps.",
    inputSchema: PRODUCT_DISCOVERY_TICKETS_TOOL_JSON_SCHEMA,
  });

  const draft = validateTicketsDraft(rawOutput);
  return { status: "generated", tickets: draft.tickets, gaps: draft.gaps };
}
