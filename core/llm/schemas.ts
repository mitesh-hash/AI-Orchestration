import { z } from "zod";

// Every claim the LLM makes has to point back at the transcript it came
// from — this is the schema-level enforcement of FR-2 / the Traceability
// NFR. A section with an empty sourceRefs array fails validation before it
// ever reaches a document.
export const SourceRefSchema = z.object({
  quoteOrParaphrase: z
    .string()
    .min(1, "sourceRefs entries must quote or paraphrase the transcript"),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const BrdSectionSchema = z.object({
  heading: z.string().min(1),
  text: z.string().min(1),
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every BRD section must cite at least one source reference"),
});
export type BrdSection = z.infer<typeof BrdSectionSchema>;

// FR-5: things the transcript didn't cover are flagged here instead of
// being invented inside a section's `text`.
export const GapSchema = z.object({
  section: z.string().min(1),
  reason: z.string().min(1),
});
export type Gap = z.infer<typeof GapSchema>;

export const BrdDraftSchema = z.object({
  title: z.string().min(1),
  sections: z.array(BrdSectionSchema).min(1),
  gaps: z.array(GapSchema),
});
export type BrdDraft = z.infer<typeof BrdDraftSchema>;

// FR-6: owner is nullable on purpose — null means "not stated in the
// transcript" and is normalized to the literal string "Owner not
// specified" by the guardrails layer, never guessed at here.
export const ActionItemDraftSchema = z.object({
  description: z.string().min(1),
  owner: z.string().min(1).nullable(),
  deadline: z.string().min(1).nullable(),
  sourceQuote: z.string().min(1),
});
export type ActionItemDraft = z.infer<typeof ActionItemDraftSchema>;

export const ActionItemsDraftSchema = z.object({
  items: z.array(ActionItemDraftSchema),
});
export type ActionItemsDraft = z.infer<typeof ActionItemsDraftSchema>;

// Hand-written JSON Schemas for the Anthropic tool_use input_schema. Kept in
// lockstep with the Zod schemas above by the tests in tests/llm.test.ts
// rather than generated, to avoid a codegen dependency for two small shapes.
export const BRD_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          text: { type: "string" },
          sourceRefs: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: { quoteOrParaphrase: { type: "string" } },
              required: ["quoteOrParaphrase"],
            },
          },
        },
        required: ["heading", "text", "sourceRefs"],
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          reason: { type: "string" },
        },
        required: ["section", "reason"],
      },
    },
  },
  required: ["title", "sections", "gaps"],
} as const;

export const ACTION_ITEMS_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          owner: { type: ["string", "null"] },
          deadline: { type: ["string", "null"] },
          sourceQuote: { type: "string" },
        },
        required: ["description", "owner", "deadline", "sourceQuote"],
      },
    },
  },
  required: ["items"],
} as const;
