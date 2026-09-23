import { describe, expect, it } from "vitest";
import { renderMermaidFlowchart } from "@/core/diagramming/renderMermaid";
import type { DiagramEdge, DiagramNode } from "@/core/llm/schemas";

const nodes: DiagramNode[] = [
  { id: "start", label: "User opens cart", type: "start", sourceRefs: [{ quoteOrParaphrase: "x" }] },
  { id: "step-1", label: "Show shipping cost", type: "step", sourceRefs: [{ quoteOrParaphrase: "x" }] },
  { id: "decision-1", label: "Cost available?", type: "decision", sourceRefs: [{ quoteOrParaphrase: "x" }] },
  { id: "end", label: "Proceed to checkout", type: "end", sourceRefs: [{ quoteOrParaphrase: "x" }] },
];

const edges: DiagramEdge[] = [
  { from: "start", to: "step-1" },
  { from: "step-1", to: "decision-1" },
  { from: "decision-1", to: "end", label: "yes" },
];

describe("renderMermaidFlowchart (FR-10 rendering)", () => {
  it("starts with a flowchart directive", () => {
    const chart = renderMermaidFlowchart(nodes, edges);
    expect(chart.startsWith("flowchart TD")).toBe(true);
  });

  it("renders start/end nodes with rounded syntax", () => {
    const chart = renderMermaidFlowchart(nodes, edges);
    expect(chart).toContain('n_start(["User opens cart"])');
    expect(chart).toContain('n_end(["Proceed to checkout"])');
  });

  it("renders decision nodes with diamond syntax", () => {
    const chart = renderMermaidFlowchart(nodes, edges);
    expect(chart).toContain('n_decision_1{"Cost available?"}');
  });

  it("renders step nodes with rectangle syntax", () => {
    const chart = renderMermaidFlowchart(nodes, edges);
    expect(chart).toContain('n_step_1["Show shipping cost"]');
  });

  it("sanitizes node ids containing hyphens for Mermaid compatibility", () => {
    const chart = renderMermaidFlowchart(nodes, edges);
    expect(chart).not.toContain("step-1");
    expect(chart).toContain("n_step_1");
  });

  it("renders plain edges without a label", () => {
    const chart = renderMermaidFlowchart(nodes, edges);
    expect(chart).toContain("n_start --> n_step_1");
  });

  it("renders labeled edges with pipe syntax", () => {
    const chart = renderMermaidFlowchart(nodes, edges);
    expect(chart).toContain('n_decision_1 -->|yes| n_end');
  });

  it("escapes double quotes in labels", () => {
    const quoted: DiagramNode[] = [
      { id: "n1", label: 'Click "Add to cart"', type: "step", sourceRefs: [{ quoteOrParaphrase: "x" }] },
    ];
    const chart = renderMermaidFlowchart(quoted, []);
    expect(chart).toContain("Click 'Add to cart'");
  });

  it("prefixes every node id, including Mermaid reserved words like 'end'", () => {
    const reserved: DiagramNode[] = [
      { id: "end", label: "Terminal step", type: "end", sourceRefs: [{ quoteOrParaphrase: "x" }] },
      { id: "1step", label: "First step", type: "step", sourceRefs: [{ quoteOrParaphrase: "x" }] },
    ];
    const chart = renderMermaidFlowchart(reserved, []);
    expect(chart).toContain("n_end");
    expect(chart).toContain("n_1step");
    // Never emit a bare reserved word as a node id on its own line.
    expect(chart).not.toMatch(/^\s*end\(/m);
  });
});
