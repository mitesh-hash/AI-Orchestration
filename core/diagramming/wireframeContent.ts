import type { WireframeOption } from "../llm/schemas";

export interface WireframeSetContent {
  options: WireframeOption[];
}

// WireframeSet.content is stored as Prisma Json; this is the one place
// that reads it back into a typed shape, shared by the review page and any
// action that needs a wireframe set's own content (e.g. FRD generation).
export function readWireframeContent(content: unknown): WireframeSetContent | null {
  if (content && typeof content === "object" && "options" in content) {
    return content as WireframeSetContent;
  }
  return null;
}
