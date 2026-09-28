import type { BrdSection } from "../llm/schemas";

export interface BrdContent {
  title: string;
  sections: BrdSection[];
}

// RequirementDocument.content is stored as Prisma Json; this is the one
// place that reads it back into a typed shape, shared by the review page
// and any action that needs the BRD's own content (e.g. ticket generation).
export function readBrdContent(content: unknown): BrdContent | null {
  if (
    content &&
    typeof content === "object" &&
    "title" in content &&
    "sections" in content
  ) {
    return content as BrdContent;
  }
  return null;
}

// FR-3's FRD and FR-4's PRD are stored in the exact same {title, sections}
// shape as a BRD (see the schema comment on RequirementDocument.content) --
// aliased rather than duplicated so there's one reader function, with
// names that stay clear at each call site about which document type is
// actually being read.
export type FrdContent = BrdContent;
export const readFrdContent = readBrdContent;

export type PrdContent = BrdContent;
export const readPrdContent = readBrdContent;
