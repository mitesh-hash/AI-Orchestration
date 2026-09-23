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
