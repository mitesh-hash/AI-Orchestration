# Quloi AI Orchestration -- MVP vertical slices

Internal Product Team tool that turns a meeting transcript into a reviewable
first-draft BRD, an action-item table, and draft Product Discovery Jira
tickets. Built incrementally from the FRD, one vertical slice at a time.

## What's built so far

**Slice 1 (FR-1, FR-2, FR-5, FR-6, FR-18, FR-19):**
1. Paste a meeting transcript (plain text) with a title and meeting date.
2. The tool generates a first-draft BRD where every section cites the part
   of the transcript it came from (FR-2), and anything not covered by the
   transcript is listed as a flagged gap instead of invented (FR-5).
3. The tool extracts an action-item table; any item with no stated owner is
   labeled `"Owner not specified"` rather than left blank or guessed (FR-6).
4. Nothing is final until a named reviewer clicks Approve or Reject on the
   review screen (FR-18); the decision, approver, and timestamp are recorded
   (FR-19).

**Slice 2 (FR-7, FR-9):**
5. From an existing BRD, draft Product Discovery Jira tickets covering the
   User Journey / Design / FRD milestones (FR-7). Each ticket cites the BRD
   text it came from; a milestone the BRD can't ground a ticket for is
   flagged as a gap instead of getting an invented ticket.
6. Tickets are drafts only, reviewed with their own Approve/Reject
   (same guardrail as the BRD) -- nothing is ever written to Jira directly
   (FR-9). Copy an approved ticket into Jira by hand.

**Slice 3 (FR-8):**
7. Paste "signed-off design and developer specs" notes (free text -- FR-11's
   wireframes and FR-16's dev-spec generation don't exist yet, so this is
   pasted in directly rather than generated) to draft development/technical
   tickets, kept in a visually and functionally separate section from
   Product Discovery tickets.
8. Every dev ticket cites the pasted spec text it came from; anything the
   notes don't cover concretely is flagged as a gap instead of an invented
   validation/rule. Dev tickets get their own independent Approve/Reject,
   same guardrail and same draft-only rule (FR-9) as every other ticket type.

**Slice 4 (FR-10, FR-11):**
9. Generate a User Flow diagram directly from an existing BRD (same source
   pattern as FR-7's tickets -- confirmed with the user). Every step cites
   the BRD text it came from; a part of the process the BRD doesn't
   describe is left out and flagged instead of guessed. Rendered as an
   actual Mermaid flowchart in the browser, deterministically built from a
   validated node/edge graph -- the model never emits Mermaid syntax
   directly, which keeps the citation contract schema-enforceable per node.
10. Paste a description of the team's existing design system (free text --
    no design-system integration or image generation exists yet, confirmed
    with the user) to draft 2-3 rough wireframe options grounded in both
    that description and the BRD. Options are deliberately rough
    (labeled box layouts, not pixel-precise mockups); a region's label
    names the design-system convention it follows, and anything neither
    source specifies is flagged as a gap rather than an invented style.
    The whole set of options is reviewed and approved/rejected as one
    decision.

Nothing is written to Jira, Confluence, or Google Drive/Docs in any slice so
far -- those integrations, and the remaining FRs, are deferred to later
slices.

## Stack

- Next.js 14 (App Router, TypeScript) -- UI + server actions in one app.
- Prisma + Postgres -- persistence for Transcript / RequirementDocument /
  ActionItem (see `prisma/schema.prisma`).
- Anthropic API (Claude), called through structured tool-use so the model's
  response is forced into the citation/gap/owner contract in
  `core/llm/schemas.ts` rather than freeform prose.
- Mermaid (client-side only, dynamically imported) for rendering the User
  Flow diagram from a validated node/edge graph.
- Vitest for unit tests of the guardrail and generation modules.

## Project layout

```
app/                    UI (App Router pages) + server actions
core/
  llm/                  Anthropic client, prompts, structured-output schemas
  guardrails/           input checks, citation/gap validation, owner
                         normalization, the approval state machine
  documentation/        generateBrd() -- FR-1/FR-2/FR-5
  actions-tickets/      extractActionItems() -- FR-6
                        generateProductDiscoveryTickets() -- FR-7
                        generateDevelopmentTickets() -- FR-8
  diagramming/          generateUserFlowDiagram() -- FR-10
                        generateWireframeOptions() -- FR-11
                        renderMermaid.ts -- pure graph-to-Mermaid renderer
  db/                   Prisma-backed repositories
prisma/                 schema + migrations
tests/                  unit tests, one folder per core module
```

Each `core/*` module only talks to the LLM and guardrail layers directly --
nothing in `core/documentation`, `core/actions-tickets`, or
`core/diagramming` can write to the database or call an external system on
its own, and nothing outside `core/guardrails/approvalGate.ts` can mark a
document, ticket, diagram, or wireframe set APPROVED or REJECTED (the same
guardrail function is reused for all of them, backed by different
repositories -- see `core/db/documentRepository.ts`,
`core/db/ticketRepository.ts`, `core/db/diagramRepository.ts`, and
`core/db/wireframeSetRepository.ts`).

The User Flow diagram is deliberately never Mermaid text generated by the
model directly -- `generateUserFlowDiagram` gets back a validated node/edge
graph (every node schema-required to cite the BRD), and
`core/diagramming/renderMermaid.ts` deterministically converts that into
Mermaid syntax. That keeps the citation guardrail enforceable at the node
level; trusting the model to hand-write correct, grounded Mermaid text
directly would not.

Tickets can be generated from a BRD in any status (draft, pending, or
approved) -- the ticket gets its own independent approval, and the review
screen always shows the source BRD's current status alongside its tickets
so a reviewer knows what they were drafted from.

`Ticket.type` (`PRODUCT_DISCOVERY` | `DEVELOPMENT`) determines which of two
source fields is populated -- `sourceDocumentId` (a BRD) for Product
Discovery, `sourceDevSpecId` (a pasted `DevSpecNote`) for development. Only
one is ever set for a given ticket; enforced by each type having its own
`create*Tickets` function in `core/db/ticketRepository.ts` rather than a DB
constraint, since every write path is one of those two functions.

## Local setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and ANTHROPIC_API_KEY
npx prisma migrate dev
npm run dev
```

Then open http://localhost:3000, paste a transcript, and follow the review
flow. Without `ANTHROPIC_API_KEY` set, the transcript still saves and the
review page shows an explicit "BRD generation failed: ANTHROPIC_API_KEY is
not set" warning instead of crashing or fabricating a draft -- this is the
FR-5/Reliability guardrail working as intended, not a bug.

## Testing

```bash
npm test    # vitest -- guardrails, generation modules, Mermaid rendering
npm run build
```

The LLM calls are mocked in tests (`vi.mock` on
`core/llm/generateStructured`); there is no test that depends on a live
Anthropic API key.

## Known limitations / follow-ups for later slices

- No authentication yet -- single internal user, per the agreed assumption.
- Next.js is pinned to the latest 14.2.x patch; several of the CVEs `npm
  audit` reports for `next` are only fixed in the 15/16 major line, which
  pulls in React 19 and breaking API changes. Deferred rather than done as
  part of this slice, since this is an internal-only tool -- worth
  revisiting before wider rollout.
- Google Drive/Docs transcript import, FRD/PRD generation,
  comparison/verification, and the Confluence write-back are all still out
  of scope (see the FRD's remaining FRs).
- Development tickets (FR-8) take pasted free-text spec/design notes rather
  than reading FR-11 (wireframes) or FR-16 (generated dev specs), since
  neither existed at the time FR-8 was built. FR-11 now exists (this
  slice); wiring dev-ticket generation to consume a wireframe set's output
  as an alternative input path, instead of or alongside the free-text
  paste, is a reasonable small follow-up -- the ticket/guardrail machinery
  underneath doesn't need to change either way.
- `DesignSystemNote` (FR-11) is scoped per-transcript, like `DevSpecNote`,
  so a design system reference has to be re-pasted for every new
  transcript even though a real design system rarely changes between
  features. A follow-up slice could make it a reusable, org-wide reference
  (or wire in a real Figma/design-system integration) instead.
- Wireframe options are rendered as labeled box layouts (grounded content,
  not visual fidelity) rather than true pixel-level mockups -- there's no
  image generation or real design-token/component rendering in this slice,
  consistent with the FRD calling these "rough" options.
