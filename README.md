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

**Slice 5 (FR-12, FR-13, FR-14, FR-15):**
11. Paste any two versions of a document, design description, or feedback
    (free text, independent of any specific entity type -- confirmed with
    the user) to get a side-by-side differences table, topic by topic
    (FR-12). A genuine contradiction between the two is flagged explicitly
    rather than resolved in favor of either side (FR-13); the guardrail
    also rejects a "conflict" whose two sides say the same thing.
12. Paste a frozen/signed-off prototype's HTML (free text -- no file upload
    exists, confirmed with the user) to extract its structure for
    documentation (FR-14). Every extracted element cites the actual HTML
    snippet it came from, so the model can't describe UI that isn't really
    there.
13. Cross-check an existing BRD against an already-extracted prototype
    structure (FR-15), scoped explicitly and honestly to what static
    markup can actually demonstrate -- visible text, presence of elements,
    markup attributes -- never a claim about runtime/JS behavior, which
    nothing in this stack executes. A requirement the BRD doesn't state
    concretely enough to check becomes "not checkable" rather than a
    guessed pass or fail. The review page carries an explicit scope
    disclaimer alongside the results.

**Slice 6 (FR-16, FR-17):**
14. Generate developer specs -- validations, business rules, and
    error/success messages -- from an existing BRD (the "feature
    description" FR-16 names) and an already-extracted prototype structure
    (the "frozen prototype", FR-14's output). No new input mechanism: this
    slot naturally consumes the two artifacts slice 5 already introduced.
15. Every rule is either grounded in an explicit statement in the BRD or
    prototype (`needsConfirmation: false`) or flagged `needsConfirmation:
    true` (FR-17) -- an inferred rule (e.g. "this looks like an email
    field, so it probably needs email format validation") is never
    presented as settled. Even a needs-confirmation rule still cites what
    prompted it (the BRD text or prototype element); the flag carries the
    certainty signal, not the presence of a citation. Rendered with a
    CONFIRMED/NEEDS CONFIRMATION badge per rule, grouped by type
    (Validations / Business Rules / Error-Success Messages).

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
  comparison/           generateComparison() -- FR-12/FR-13
                        generatePrototypeStructure() -- FR-14
                        generatePrototypeCrossCheck() -- FR-15
  devspec/              generateDevSpec() -- FR-16/FR-17
  db/                   Prisma-backed repositories
prisma/                 schema + migrations
tests/                  unit tests, one folder per core module
```

Each `core/*` module only talks to the LLM and guardrail layers directly --
nothing in `core/documentation`, `core/actions-tickets`, `core/diagramming`,
`core/comparison`, or `core/devspec` can write to the database or call an
external system on its own, and nothing outside
`core/guardrails/approvalGate.ts` can mark any of the app's eight
approvable entity types (BRD, ticket, diagram, wireframe set, comparison,
prototype extraction, prototype cross-check, developer spec) APPROVED or
REJECTED -- the same guardrail function is reused for all of them, backed
by a different repository each time (see `core/db/*.ts`).

`Comparison` and `PrototypeExtraction` follow a create-draft-then-fill
pattern: the row is created immediately with the user's pasted text/HTML
and a null `content`, then updated with `content` once generation succeeds
(`setComparisonContent` / `setPrototypeExtractionContent`). That's what
lets a failed or skipped generation still preserve exactly what the user
pasted, the same principle as Transcript vs RequirementDocument in slice 1,
applied to an entity that would otherwise conflate raw input and generated
output in one record. `PrototypeCrossCheck` doesn't need this -- both its
inputs (a BRD, a PrototypeExtraction) already persist independently, so a
failed cross-check attempt has nothing of the user's to lose.

The User Flow diagram is deliberately never Mermaid text generated by the
model directly -- `generateUserFlowDiagram` gets back a validated node/edge
graph (every node schema-required to cite the BRD), and
`core/diagramming/renderMermaid.ts` deterministically converts that into
Mermaid syntax. That keeps the citation guardrail enforceable at the node
level; trusting the model to hand-write correct, grounded Mermaid text
directly would not.

Naming note: `DevSpecNote` (FR-8's pasted free-text input, from slice 3) and
`DevSpec` (FR-16/17's generated output, this slice) are two different
entities that happen to share most of a name -- the review page labels the
pasted-notes card "Developer specs / design notes (FR-8)" and the generated
one "Developer Spec (FR-16/17)" to keep them visually distinct.

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

Committing generates `tsconfig.tsbuildinfo` if you run a standalone
`tsc --noEmit`; it's gitignored -- delete it locally if it shows up as
untracked, it's not part of the project's actual build/test scripts.

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
- Google Drive/Docs transcript import, FRD/PRD generation, and the
  Confluence write-back are still out of scope (see the FRD's remaining
  FRs).
- Development tickets (FR-8) take pasted free-text spec/design notes rather
  than reading FR-11's wireframes or FR-16's generated dev specs, since
  neither existed at the time FR-8 was built. Both now exist; wiring
  dev-ticket generation to also consume a wireframe set's or a DevSpec's
  output as an alternative input path, instead of or alongside the
  free-text paste, is a reasonable small follow-up -- the ticket/guardrail
  machinery underneath doesn't need to change either way.
- `DesignSystemNote` (FR-11) is scoped per-transcript, like `DevSpecNote`,
  so a design system reference has to be re-pasted for every new
  transcript even though a real design system rarely changes between
  features. A follow-up slice could make it a reusable, org-wide reference
  (or wire in a real Figma/design-system integration) instead.
- Wireframe options are rendered as labeled box layouts (grounded content,
  not visual fidelity) rather than true pixel-level mockups -- there's no
  image generation or real design-token/component rendering in this slice,
  consistent with the FRD calling these "rough" options.
- Comparison (FR-12/13) takes two freely pasted texts rather than a picker
  over existing artifacts, since the app doesn't keep multiple versions of
  any one artifact yet (one BRD/wireframe set per transcript). A BA can
  still paste a generated artifact's own text into either side by hand.
- Prototype input (FR-14) is pasted raw HTML, not a file upload -- there's
  no upload/storage infrastructure in the app. FR-15's cross-check is
  scoped to static structure and content only; it cannot and does not
  claim to verify actual runtime/interactive behavior (see the scope
  disclaimer on the review page), since nothing in this stack executes the
  prototype in a real browser.
