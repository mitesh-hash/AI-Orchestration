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
