import type { PrototypeSection } from "../llm/schemas";

export interface PrototypeContent {
  title: string;
  sections: PrototypeSection[];
}

// PrototypeExtraction.content is stored as Prisma Json (and starts out
// null until generation succeeds); this is the one place that reads it
// back into a typed shape, shared by the review page and the cross-check
// generation action.
export function readPrototypeContent(content: unknown): PrototypeContent | null {
  if (content && typeof content === "object" && "title" in content && "sections" in content) {
    return content as PrototypeContent;
  }
  return null;
}
