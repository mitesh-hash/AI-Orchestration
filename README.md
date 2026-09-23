# Quloi AI Orchestration -- MVP vertical slice

Internal Product Team tool that turns a meeting transcript into a reviewable
first-draft BRD and an action-item table. This is the **first vertical
slice** built from the FRD (FR-1, FR-2, FR-5, FR-6, FR-18, FR-19) -- see
`docs/` for the fuller module breakdown as later slices land.

## What this slice does

1. Paste a meeting transcript (plain text) with a title and meeting date.
2. The tool generates a first-draft BRD where every section cites the part
   of the transcript it came from (FR-2), and anything not covered by the
   transcript is listed as a flagged gap instead of invented (FR-5).
3. The tool extracts an action-item table; any item with no stated owner is
   labeled `"Owner not specified"` rather than left blank or guessed (FR-6).
4. Nothing is final until a named reviewer clicks Approve or Reject on the
   review screen (FR-18); the decision, approver, and timestamp are recorded
   (FR-19).
5. Nothing is written to Jira, Confluence, or Google Drive/Docs in this
   slice -- those integrations, and FR-3/4/7-17/20, are deferred to later
   slices.

## Stack

- Next.js 14 (App Router, TypeScript) -- UI + server actions in one app.
- Prisma + Postgres -- persistence for Transcript / RequirementDocument /
  ActionItem (see `prisma/schema.prisma`).
- Anthropic API (Claude), called through structured tool-use so the model's
  response is forced into the citation/gap/owner contract in
  `core/llm/schemas.ts` rather than freeform prose.
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
  db/                   Prisma-backed repositories
prisma/                 schema + migrations
tests/                  unit tests, one folder per core module
```

Each `core/*` module only talks to the LLM and guardrail layers directly --
nothing in `core/documentation` or `core/actions-tickets` can write to the
database or call an external system on its own, and nothing outside
`core/guardrails/approvalGate.ts` can mark a document APPROVED or REJECTED.

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
npm test    # vitest -- guardrails, generateBrd, extractActionItems
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
- Google Drive/Docs transcript import, FRD/PRD generation, ticket drafting,
  diagramming, comparison/verification, and the Confluence write-back are
  all out of scope for this slice (see the FRD's FR-3/4/7-17/20).
