import type { DevSpecRule, Gap } from "../llm/schemas";

export interface DevSpecContent {
  rules: DevSpecRule[];
  gaps: Gap[];
}

// DevSpec.content is stored as Prisma Json; this is the one place that
// reads it back into a typed shape, shared by the review page and any
// action that needs a dev spec's own content (e.g. FRD generation).
export function readDevSpecContent(content: unknown): DevSpecContent | null {
  if (content && typeof content === "object" && "rules" in content) {
    return content as DevSpecContent;
  }
  return null;
}
