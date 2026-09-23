import { describe, expect, it } from "vitest";
import { validateUserFlowDiagramDraft } from "@/core/guardrails/diagramValidation";
import { GuardrailViolationError } from "@/core/guardrails/errors";

const validDraft = {
  title: "Cart checkout flow",
  nodes: [
    { id: "start", label: "User opens cart", type: "start", sourceRefs: [{ quoteOrParaphrase: "opens the cart" }] },
    { id: "end", label: "Checkout complete", type: "end", sourceRefs: [{ quoteOrParaphrase: "completes checkout" }] },
  ],
  edges: [{ from: "start", to: "end" }],
  gaps: [],
};

describe("validateUserFlowDiagramDraft (FR-10 contract enforcement)", () => {
  it("accepts a well-formed graph", () => {
    expect(() => validateUserFlowDiagramDraft(validDraft)).not.toThrow();
  });

  it("rejects a node with no source references", () => {
    const draft = {
      ...validDraft,
      nodes: [{ ...validDraft.nodes[0], sourceRefs: [] }, validDraft.nodes[1]],
    };
    expect(() => validateUserFlowDiagramDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects an edge referencing a node id that was never declared", () => {
    const draft = {
      ...validDraft,
      edges: [{ from: "start", to: "nonexistent-node" }],
    };
    expect(() => validateUserFlowDiagramDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects an invalid node type", () => {
    const draft = {
      ...validDraft,
      nodes: [{ ...validDraft.nodes[0], type: "loop" }, validDraft.nodes[1]],
    };
    expect(() => validateUserFlowDiagramDraft(draft)).toThrow(GuardrailViolationError);
  });

  it("rejects malformed input entirely", () => {
    expect(() => validateUserFlowDiagramDraft({ nonsense: true })).toThrow(GuardrailViolationError);
  });
});
