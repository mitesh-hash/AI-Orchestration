import type { DiagramEdge, DiagramNode } from "../llm/schemas";

// Deterministic, LLM-free rendering: the model only ever produces a
// validated node/edge graph (core/guardrails/diagramValidation.ts), and this
// function turns that into Mermaid flowchart syntax. Keeping rendering out
// of the LLM's hands means a citation-enforceable structure always survives
// into what gets displayed -- there's no freeform diagram text to trust.

// Always namespaced with a fixed prefix, rather than only special-cased
// when the id starts with a digit: Mermaid reserves several bare words as
// syntax keywords (famously "end", used to close a subgraph block -- a very
// natural id for a terminal node to pick), and maintaining a blocklist of
// every reserved word would be fragile. Prefixing everything sidesteps the
// whole class of collision at once.
function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_]/g, "_");
  return `n_${cleaned}`;
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'");
}

function wrapNode(id: string, label: string, type: DiagramNode["type"]): string {
  const safeId = sanitizeId(id);
  const safeLabel = escapeLabel(label);
  switch (type) {
    case "start":
    case "end":
      return `  ${safeId}(["${safeLabel}"])`;
    case "decision":
      return `  ${safeId}{"${safeLabel}"}`;
    case "step":
    default:
      return `  ${safeId}["${safeLabel}"]`;
  }
}

export function renderMermaidFlowchart(nodes: DiagramNode[], edges: DiagramEdge[]): string {
  const lines = ["flowchart TD"];

  for (const node of nodes) {
    lines.push(wrapNode(node.id, node.label, node.type));
  }

  for (const edge of edges) {
    const from = sanitizeId(edge.from);
    const to = sanitizeId(edge.to);
    if (edge.label) {
      // Mermaid's edge-label syntax is pipe-delimited, so a literal "|" in
      // the label would break it -- strip it rather than escape it, since
      // there's no escape sequence for it in this position.
      const safeLabel = escapeLabel(edge.label).replace(/\|/g, "/");
      lines.push(`  ${from} -->|${safeLabel}| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  return lines.join("\n");
}
