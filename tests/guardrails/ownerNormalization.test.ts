import { describe, expect, it } from "vitest";
import { normalizeOwner, UNSPECIFIED_OWNER } from "@/core/guardrails/ownerNormalization";

describe("normalizeOwner (FR-6)", () => {
  it("passes through a stated owner unchanged", () => {
    expect(normalizeOwner("Raj")).toBe("Raj");
  });

  it("trims whitespace around a stated owner", () => {
    expect(normalizeOwner("  Raj  ")).toBe("Raj");
  });

  it("labels a null owner explicitly instead of leaving it blank", () => {
    expect(normalizeOwner(null)).toBe(UNSPECIFIED_OWNER);
  });

  it("labels an undefined owner explicitly", () => {
    expect(normalizeOwner(undefined)).toBe(UNSPECIFIED_OWNER);
  });

  it("labels a whitespace-only owner explicitly rather than passing it through", () => {
    expect(normalizeOwner("   ")).toBe(UNSPECIFIED_OWNER);
  });
});
