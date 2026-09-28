import { describe, expect, it } from "vitest";
import { renderPrdAsConfluenceMarkdown } from "@/core/documentation/renderConfluenceMarkdown";

describe("renderPrdAsConfluenceMarkdown (FR-5a)", () => {
  it("renders the title as an H1 and each section as an H2 with its text", () => {
    const markdown = renderPrdAsConfluenceMarkdown({
      title: "Checkout redesign PRD",
      sections: [
        {
          heading: "Problem Statement",
          text: "Customers abandon checkout because shipping cost isn't shown up front.",
          sourceRefs: [{ quoteOrParaphrase: "users can't see shipping cost until the final step" }],
        },
        {
          heading: "Goals",
          text: "Show shipping cost earlier in the flow.",
          sourceRefs: [{ quoteOrParaphrase: "we want to surface shipping earlier" }],
        },
      ],
    });

    expect(markdown).toBe(
      [
        "# Checkout redesign PRD",
        "",
        "## Problem Statement",
        "",
        "Customers abandon checkout because shipping cost isn't shown up front.",
        "",
        "## Goals",
        "",
        "Show shipping cost earlier in the flow.",
      ].join("\n")
    );
  });

  it("renders just the title heading when there are no sections", () => {
    const markdown = renderPrdAsConfluenceMarkdown({ title: "Empty PRD", sections: [] });
    expect(markdown).toBe("# Empty PRD\n\n");
  });
});
