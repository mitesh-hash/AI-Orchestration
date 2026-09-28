import type { PrdContent } from "./brdContent";

// FR-5a: deterministically reformats an already-approved PRD as
// copy-paste-ready Markdown for Confluence. Pure and LLM-free on purpose --
// this only reformats content a human has already reviewed and approved,
// so there is no new fabrication risk to guard against, and no live
// Confluence API call anywhere in this app (nothing calls an external
// system without explicit user action -- the human pastes this in
// themselves, same principle as FR-9's Jira tickets).
export function renderPrdAsConfluenceMarkdown(prd: PrdContent): string {
  const sections = prd.sections
    .map((section) => `## ${section.heading}\n\n${section.text}`)
    .join("\n\n");

  return `# ${prd.title}\n\n${sections}`;
}
