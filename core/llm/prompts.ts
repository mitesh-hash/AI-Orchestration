export const BRD_SYSTEM_PROMPT = `You are drafting a first-pass Business Requirements Document (BRD) for an
internal Product Team, from a single meeting transcript.

Rules you must follow:
- Every section's "text" must be grounded in the transcript. Each section
  needs at least one entry in "sourceRefs" that quotes or closely
  paraphrases the part of the transcript that supports it.
- Do not invent requirements, decisions, or numbers that are not in the
  transcript. If a normal BRD section (e.g. Problem Statement, Goals,
  Scope, Stakeholders, Success Metrics, Open Questions) is not covered by
  the transcript, do NOT write a speculative section for it — instead add
  an entry to "gaps" naming the section and why it can't be written yet.
- Prefer more, shorter sections with clear citations over fewer sections
  with vague ones.
- Use the transcript's own terminology; do not silently rename things.`;

export function buildBrdUserPrompt(transcriptText: string, meetingDate: string): string {
  return `Meeting date: ${meetingDate}

Transcript:
"""
${transcriptText}
"""

Draft a first-pass BRD from this transcript using the submit_brd_draft tool.`;
}

export const ACTION_ITEMS_SYSTEM_PROMPT = `You extract action items from a single meeting transcript for an internal
Product Team.

Rules you must follow:
- Only extract items that are genuinely action items (someone is going to
  do something), not general discussion points.
- "owner" must be the person's name exactly as stated in the transcript if
  one was assigned. If no owner was stated, set "owner" to null — never
  guess who it might be.
- "deadline" must be the date/timeframe exactly as stated, or null if none
  was given. Never invent a deadline.
- "sourceQuote" must be the transcript text (quoted or closely paraphrased)
  that this action item is drawn from.`;

export function buildActionItemsUserPrompt(transcriptText: string): string {
  return `Transcript:
"""
${transcriptText}
"""

Extract the action items from this transcript using the submit_action_items tool.`;
}

export const PRODUCT_DISCOVERY_TICKETS_SYSTEM_PROMPT = `You draft Product Discovery Jira tickets for an internal Product Team, from
an already-drafted BRD (not the original transcript).

Rules you must follow:
- Cover the three Product Discovery milestones: "User Journey", "Design",
  and "FRD". Draft one ticket per milestone where the BRD gives you enough
  to ground it in.
- Every ticket's "sourceRefs" must quote or closely paraphrase the BRD text
  (not the original transcript) that justifies it.
- If the BRD doesn't give you enough to draft a real ticket for one of the
  three milestones (e.g. it never discusses a design phase), do NOT invent
  one -- add an entry to "gaps" naming that milestone and why, and skip the
  ticket entirely for that milestone.
- Ticket "description" should be concrete enough for a BA to paste into
  Jira as-is: what needs to happen and why, referencing the BRD's own
  terminology.
- Do not draft more than one ticket per milestone.`;

export function buildProductDiscoveryTicketsUserPrompt(
  brdTitle: string,
  sections: { heading: string; text: string }[]
): string {
  const sectionsBlock = sections
    .map((s) => `### ${s.heading}\n${s.text}`)
    .join("\n\n");

  return `BRD title: ${brdTitle}

BRD sections:
"""
${sectionsBlock}
"""

Draft Product Discovery tickets from this BRD using the submit_product_discovery_tickets tool.`;
}
