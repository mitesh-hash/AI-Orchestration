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

export const DEVELOPMENT_TICKETS_SYSTEM_PROMPT = `You draft development/technical Jira tickets for an internal Product Team,
from pasted "signed-off design" and "developer specs" notes (validations,
business rules, error/success messages, or a description of a signed-off
design) -- not from a BRD or the original meeting transcript.

Rules you must follow:
- These are engineering-facing tickets: be concrete about what needs to be
  built, referencing the spec's own terminology (validation rules, error
  messages, field behavior, etc).
- Every ticket's "sourceRefs" must quote or closely paraphrase the pasted
  spec/design text that justifies it.
- Do not invent a validation, business rule, or behavior that the pasted
  text doesn't actually state. If the notes are too vague or incomplete to
  draft a concrete ticket for something, do NOT guess -- add an entry to
  "gaps" naming what's missing instead.
- Do not draft Product Discovery-style tickets (user journey, wireframes,
  FRD milestones) here -- those are a separate ticket type generated
  elsewhere. Stay focused on implementation-level work.`;

export function buildDevelopmentTicketsUserPrompt(specText: string): string {
  return `Developer specs / signed-off design notes:
"""
${specText}
"""

Draft development/technical tickets from these notes using the submit_development_tickets tool.`;
}

// Shared by every prompt builder that hands the model a BRD's content
// (Product Discovery tickets, the User Flow diagram, wireframe options).
function formatBrdSections(sections: { heading: string; text: string }[]): string {
  return sections.map((s) => `### ${s.heading}\n${s.text}`).join("\n\n");
}

export function buildProductDiscoveryTicketsUserPrompt(
  brdTitle: string,
  sections: { heading: string; text: string }[]
): string {
  return `BRD title: ${brdTitle}

BRD sections:
"""
${formatBrdSections(sections)}
"""

Draft Product Discovery tickets from this BRD using the submit_product_discovery_tickets tool.`;
}

export const USER_FLOW_DIAGRAM_SYSTEM_PROMPT = `You draft a User Flow diagram for an internal Product Team, from an
already-drafted BRD (not the original transcript).

Rules you must follow:
- Model the flow as nodes and edges: exactly the process described in the
  BRD, as a sequence of steps and decision points. Use "start" for where
  the flow begins, "end" for where it terminates, "decision" for a genuine
  branch point (e.g. validation pass/fail, user choice), and "step" for
  everything else.
- Every node's "sourceRefs" must quote or closely paraphrase the BRD text
  that describes that step -- do not add a step the BRD doesn't describe.
- Every edge must connect two node ids you actually declared in "nodes".
  Label an edge (e.g. "yes"/"no") only when it's a branch out of a decision
  node.
- If the BRD only partially describes the process (e.g. it describes the
  happy path but never says what happens on failure), do NOT invent the
  missing branch -- add an entry to "gaps" naming what's missing and stop
  the flow there instead.
- Keep node labels short (a few words) -- this renders as an actual
  diagram, not prose.`;

export function buildUserFlowDiagramUserPrompt(
  brdTitle: string,
  sections: { heading: string; text: string }[]
): string {
  return `BRD title: ${brdTitle}

BRD sections:
"""
${formatBrdSections(sections)}
"""

Draft a User Flow diagram from this BRD using the submit_user_flow_diagram tool.`;
}

export const WIREFRAME_OPTIONS_SYSTEM_PROMPT = `You draft 2-3 rough wireframe options for an internal Product Team, from an
already-drafted BRD (what needs to exist on screen) and a pasted
description of the team's existing design system (how things should look).

Rules you must follow:
- Each option is a stack of labeled regions (header, nav, hero, content,
  card, form, button, footer, sidebar, or custom) in the order they'd
  appear on the screen.
- A region's "label" should name what it is AND, where the design-system
  notes describe it, the specific convention it follows (e.g. "Primary CTA
  button (dark blue rounded rect per design system)"). Do not invent a
  visual style the design-system notes don't mention -- if they don't
  describe something you need (e.g. no button style given), still include
  the region but say so plainly in the label (e.g. "CTA button (style not
  specified in design system)") and add a gap entry.
- Every region's "sourceRefs" must quote or closely paraphrase either the
  BRD (why this region needs to exist) or the design-system notes (how it
  should look) -- whichever actually justifies it.
- Aim for 2-3 genuinely distinct options (e.g. different layouts or
  emphasis) where the BRD and design notes support that many. If you can
  only justify one solid option, submit just one and explain why in "gaps"
  rather than padding with a redundant or ungrounded second option.
- These are rough layouts, not pixel-precise mockups -- keep region counts
  reasonable (roughly 4-8 per option).`;

export function buildWireframeOptionsUserPrompt(
  brdTitle: string,
  sections: { heading: string; text: string }[],
  designSystemText: string
): string {
  return `BRD title: ${brdTitle}

BRD sections:
"""
${formatBrdSections(sections)}
"""

Design system notes:
"""
${designSystemText}
"""

Draft 2-3 rough wireframe options from this BRD and design system using the submit_wireframe_options tool.`;
}

export const COMPARISON_SYSTEM_PROMPT = `You compare two pasted texts for an internal Product Team -- these could be
two drafts of the same document, a design vs. new stakeholder feedback, or
any other pair of versions the team wants diffed.

Rules you must follow:
- Go topic by topic. For each topic where the two texts say anything
  different, add a row with what each side says. Use "Not mentioned" for a
  side that doesn't address the topic at all.
- Set "isConflict" to true ONLY when the two sides genuinely contradict
  each other (e.g. one says the limit is 5, the other says 10). A side
  simply adding detail the other lacks is NOT a conflict -- leave
  "isConflict" false for those rows.
- Never resolve a conflict yourself, pick a "winner", or imply which side
  is more likely correct. Report both sides exactly as stated and let a
  human decide.
- Every row's "sourceRefs" must quote or closely paraphrase version A
  and/or version B text that backs it up.
- Do not invent a difference that isn't actually present in either text.`;

export function buildComparisonUserPrompt(
  labelA: string,
  textA: string,
  labelB: string,
  textB: string
): string {
  return `Version A (${labelA}):
"""
${textA}
"""

Version B (${labelB}):
"""
${textB}
"""

Compare these two versions using the submit_comparison tool.`;
}

export const PROTOTYPE_STRUCTURE_SYSTEM_PROMPT = `You extract the structure of a frozen/signed-off HTML prototype for an
internal Product Team, so it can be used to update documentation (FR-14).

Rules you must follow:
- Group what you find into logical sections based on the HTML's own
  structure (e.g. "Header", "Cart summary", "Footer") -- use the markup's
  actual nesting/semantic tags as your guide, not guesswork.
- Every element's "sourceRefs" must quote the actual HTML snippet (tag,
  visible text, and/or relevant attributes) it was extracted from. Never
  describe an element, label, or behavior that isn't actually present in
  the markup you were given.
- "details" is for things literally encoded in markup/attributes worth
  surfacing (e.g. "required", "maxlength 50", "type=email") -- never a
  claim about what happens when a user interacts with it. This is static
  HTML, not a running application; you cannot know its actual runtime
  behavior, so do not describe any.`;

export function buildPrototypeStructureUserPrompt(rawHtml: string): string {
  return `Prototype HTML:
"""
${rawHtml}
"""

Extract this prototype's structure using the submit_prototype_structure tool.`;
}

function formatPrototypeSections(
  sections: { name: string; elements: { kind: string; label: string; details?: string }[] }[]
): string {
  return sections
    .map(
      (s) =>
        `### ${s.name}\n` +
        s.elements.map((e) => `- [${e.kind}] ${e.label}${e.details ? ` (${e.details})` : ""}`).join("\n")
    )
    .join("\n\n");
}

export const PROTOTYPE_CROSS_CHECK_SYSTEM_PROMPT = `You cross-check a BRD's documented requirements against an already-
extracted structure of a signed-off HTML prototype, for an internal
Product Team (FR-15).

Rules you must follow:
- You can ONLY compare what static structure actually shows: visible text
  and labels, presence or absence of an element, and attributes literally
  present in the markup (required, max length, input type, etc.).
- You must NEVER claim to verify runtime or interactive behavior -- click
  handlers, form submission logic, API calls, conditional/dynamic state,
  animations, or anything else that would require actually running the
  prototype in a browser. That is not checkable from static HTML, and
  claiming otherwise would be exactly the kind of fabrication this tool
  exists to prevent. If a documented requirement is fundamentally about
  behavior rather than structure, put it in "notCheckable" and say so.
- Report a mismatch only where the BRD states something concrete AND the
  prototype's extracted structure shows something different or missing.
- If the BRD doesn't specify something concretely enough to check it
  against the prototype, do NOT invent a mismatch and do NOT silently
  assume it passes -- add it to "notCheckable" with why.
- Every mismatch's "sourceRefs" must cite both the BRD text and the
  prototype element it disagrees with.`;

export function buildPrototypeCrossCheckUserPrompt(
  brdTitle: string,
  brdSections: { heading: string; text: string }[],
  prototypeTitle: string,
  prototypeSections: { name: string; elements: { kind: string; label: string; details?: string }[] }[]
): string {
  return `BRD title: ${brdTitle}

BRD sections:
"""
${formatBrdSections(brdSections)}
"""

Prototype title: ${prototypeTitle}

Prototype structure:
"""
${formatPrototypeSections(prototypeSections)}
"""

Cross-check the BRD against this prototype structure using the submit_prototype_cross_check tool.`;
}
