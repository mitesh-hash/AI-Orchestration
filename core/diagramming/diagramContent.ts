import type { DiagramNode, DiagramEdge } from "../llm/schemas";

export interface DiagramContent {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

// Diagram.content is stored as Prisma Json; this is the one place that
// reads it back into a typed shape, shared by the review page and any
// action that needs a diagram's own content (e.g. FRD generation).
export function readDiagramContent(content: unknown): DiagramContent | null {
  if (content && typeof content === "object" && "nodes" in content && "edges" in content) {
    return content as DiagramContent;
  }
  return null;
}
