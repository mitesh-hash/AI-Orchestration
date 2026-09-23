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

// FR-7: Product Discovery tickets are drafted per milestone. Kept as a fixed
// three-way enum (rather than free text) so "which milestones got a ticket"
// is checkable, and so a milestone with nothing groundable in the BRD shows
// up as a gap instead of a vague, invented ticket.
export const PRODUCT_DISCOVERY_MILESTONES = ["User Journey", "Design", "FRD"] as const;

export const TicketDraftSchema = z.object({
  milestone: z.enum(PRODUCT_DISCOVERY_MILESTONES),
  title: z.string().min(1),
  description: z.string().min(1),
  // Cites the BRD's own text, not the original transcript -- FR-7 derives
  // tickets from the BRD, one link further down the traceability chain.
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every ticket must cite at least one part of the BRD"),
});
export type TicketDraft = z.infer<typeof TicketDraftSchema>;

export const ProductDiscoveryTicketsDraftSchema = z.object({
  tickets: z.array(TicketDraftSchema),
  gaps: z.array(GapSchema),
});
export type ProductDiscoveryTicketsDraft = z.infer<typeof ProductDiscoveryTicketsDraftSchema>;

// FR-8: development/technical tickets, drafted from pasted "signed-off
// design and developer specs" text rather than a BRD. No milestone concept
// here -- that taxonomy is specific to Product Discovery (FR-7).
export const DevTicketDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every dev ticket must cite the design/spec notes it came from"),
});
export type DevTicketDraft = z.infer<typeof DevTicketDraftSchema>;

export const DevelopmentTicketsDraftSchema = z.object({
  tickets: z.array(DevTicketDraftSchema),
  gaps: z.array(GapSchema),
});
export type DevelopmentTicketsDraft = z.infer<typeof DevelopmentTicketsDraftSchema>;

// FR-10: a User Flow diagram, modeled as a graph rather than freeform
// Mermaid text -- forcing structure here is what keeps the citation
// contract schema-enforceable per node. core/diagramming/renderMermaid.ts
// deterministically turns a validated graph into Mermaid syntax.
export const DIAGRAM_NODE_TYPES = ["start", "step", "decision", "end"] as const;

export const DiagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(DIAGRAM_NODE_TYPES),
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every diagram node must cite the BRD text it came from"),
});
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;

export const DiagramEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1).optional(),
});
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;

export const UserFlowDiagramDraftSchema = z.object({
  title: z.string().min(1),
  nodes: z.array(DiagramNodeSchema).min(1),
  edges: z.array(DiagramEdgeSchema),
  gaps: z.array(GapSchema),
});
export type UserFlowDiagramDraft = z.infer<typeof UserFlowDiagramDraftSchema>;

// FR-11: 2-3 rough wireframe options, each a stack of labeled regions. Kept
// deliberately non-visual/non-pixel-precise ("rough") -- a region's label is
// expected to name the design-system convention it follows (e.g. "Primary
// CTA button (dark blue rounded rect per design system)"), which is what
// satisfies "use the existing design system, don't invent new styles" at
// the content level without needing real design tokens or image generation.
export const WIREFRAME_REGION_KINDS = [
  "header",
  "nav",
  "hero",
  "content",
  "card",
  "form",
  "button",
  "footer",
  "sidebar",
  "custom",
] as const;

export const WireframeRegionSchema = z.object({
  label: z.string().min(1),
  kind: z.enum(WIREFRAME_REGION_KINDS),
  // May cite the BRD (why this region exists) or the design-system notes
  // (why it looks this way) -- both are supplied in the same prompt.
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every wireframe region must cite the BRD or design-system notes it came from"),
});
export type WireframeRegion = z.infer<typeof WireframeRegionSchema>;

export const WireframeOptionSchema = z.object({
  name: z.string().min(1),
  regions: z.array(WireframeRegionSchema).min(1),
});
export type WireframeOption = z.infer<typeof WireframeOptionSchema>;

// FR-11 asks for "2-3" options, but the schema caps rather than requires
// that range: forcing a minimum of 2 would pressure the model to pad with
// an ungrounded second option when the BRD/design notes only support one.
// The prompt asks for 2-3 where genuinely groundable; anything it can't
// justify becomes a gap instead of a weak option.
export const WireframeOptionsDraftSchema = z.object({
  options: z.array(WireframeOptionSchema).min(1).max(3),
  gaps: z.array(GapSchema),
});
export type WireframeOptionsDraft = z.infer<typeof WireframeOptionsDraftSchema>;

// FR-12/13: a row-per-topic diff between two pasted texts. Conflicts are
// flagged in-line (isConflict) rather than as a separate list, so a
// genuine contradiction is never silently dropped or resolved -- both
// sides are always shown side by side either way.
export const ComparisonRowSchema = z.object({
  topic: z.string().min(1),
  // "Not mentioned" (or similar) is an expected, valid value here -- one
  // side legitimately not addressing a topic is not itself a conflict.
  aSummary: z.string().min(1),
  bSummary: z.string().min(1),
  isConflict: z.boolean(),
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every comparison row must cite version A and/or version B"),
});
export type ComparisonRow = z.infer<typeof ComparisonRowSchema>;

export const ComparisonDraftSchema = z.object({
  rows: z.array(ComparisonRowSchema).min(1),
});
export type ComparisonDraft = z.infer<typeof ComparisonDraftSchema>;

// FR-14: structure extracted from a pasted HTML prototype. Every element
// cites the actual HTML snippet it came from -- extracting an element that
// isn't really in the markup would be exactly the kind of fabrication this
// whole app is built to prevent, just applied to a prototype instead of a
// transcript.
export const PROTOTYPE_ELEMENT_KINDS = [
  "heading",
  "text",
  "button",
  "link",
  "input",
  "form",
  "image",
  "navigation",
  "other",
] as const;

export const PrototypeElementSchema = z.object({
  kind: z.enum(PROTOTYPE_ELEMENT_KINDS),
  label: z.string().min(1),
  // Free-text notes on anything encoded in markup/attributes worth
  // surfacing (e.g. "required, maxlength 50") -- never a claim about
  // runtime behavior, which static HTML can't demonstrate.
  details: z.string().optional(),
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every prototype element must cite the HTML snippet it came from"),
});
export type PrototypeElement = z.infer<typeof PrototypeElementSchema>;

export const PrototypeSectionSchema = z.object({
  name: z.string().min(1),
  elements: z.array(PrototypeElementSchema).min(1),
});
export type PrototypeSection = z.infer<typeof PrototypeSectionSchema>;

export const PrototypeStructureDraftSchema = z.object({
  title: z.string().min(1),
  sections: z.array(PrototypeSectionSchema).min(1),
});
export type PrototypeStructureDraft = z.infer<typeof PrototypeStructureDraftSchema>;

// FR-15: cross-checks a BRD against an already-extracted prototype
// structure. Deliberately has no field for runtime/behavioral claims --
// see the prompt in core/llm/prompts.ts for the explicit scope limit to
// what static structure can actually demonstrate.
export const PrototypeMismatchSchema = z.object({
  topic: z.string().min(1),
  documented: z.string().min(1),
  prototypeShows: z.string().min(1),
  sourceRefs: z
    .array(SourceRefSchema)
    .min(1, "every mismatch must cite both the BRD and the prototype structure"),
});
export type PrototypeMismatch = z.infer<typeof PrototypeMismatchSchema>;

export const PrototypeCrossCheckDraftSchema = z.object({
  mismatches: z.array(PrototypeMismatchSchema),
  // Same principle as Gap elsewhere: if the BRD doesn't specify something
  // concretely enough to check it against the prototype, this is where
  // that goes instead of a guessed "mismatch" or a silently-assumed pass.
  notCheckable: z.array(GapSchema),
});
export type PrototypeCrossCheckDraft = z.infer<typeof PrototypeCrossCheckDraftSchema>;

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

export const PRODUCT_DISCOVERY_TICKETS_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    tickets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          milestone: { type: "string", enum: [...PRODUCT_DISCOVERY_MILESTONES] },
          title: { type: "string" },
          description: { type: "string" },
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
        required: ["milestone", "title", "description", "sourceRefs"],
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
  required: ["tickets", "gaps"],
} as const;

export const USER_FLOW_DIAGRAM_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    nodes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          type: { type: "string", enum: [...DIAGRAM_NODE_TYPES] },
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
        required: ["id", "label", "type", "sourceRefs"],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          label: { type: "string" },
        },
        required: ["from", "to"],
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
  required: ["title", "nodes", "edges", "gaps"],
} as const;

export const WIREFRAME_OPTIONS_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    options: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          regions: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                kind: { type: "string", enum: [...WIREFRAME_REGION_KINDS] },
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
              required: ["label", "kind", "sourceRefs"],
            },
          },
        },
        required: ["name", "regions"],
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
  required: ["options", "gaps"],
} as const;

export const DEVELOPMENT_TICKETS_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    tickets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
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
        required: ["title", "description", "sourceRefs"],
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
  required: ["tickets", "gaps"],
} as const;

export const COMPARISON_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          aSummary: { type: "string" },
          bSummary: { type: "string" },
          isConflict: { type: "boolean" },
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
        required: ["topic", "aSummary", "bSummary", "isConflict", "sourceRefs"],
      },
    },
  },
  required: ["rows"],
} as const;

export const PROTOTYPE_STRUCTURE_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          elements: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: [...PROTOTYPE_ELEMENT_KINDS] },
                label: { type: "string" },
                details: { type: "string" },
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
              required: ["kind", "label", "sourceRefs"],
            },
          },
        },
        required: ["name", "elements"],
      },
    },
  },
  required: ["title", "sections"],
} as const;

export const PROTOTYPE_CROSS_CHECK_TOOL_JSON_SCHEMA = {
  type: "object",
  properties: {
    mismatches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          documented: { type: "string" },
          prototypeShows: { type: "string" },
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
        required: ["topic", "documented", "prototypeShows", "sourceRefs"],
      },
    },
    notCheckable: {
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
  required: ["mismatches", "notCheckable"],
} as const;
