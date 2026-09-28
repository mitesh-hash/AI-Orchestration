import { checkBrdContentInput } from "../guardrails/inputCheck";
import { validateFrdDraft } from "../guardrails/brdValidation";
import { callStructuredTool } from "../llm/generateStructured";
import { FRD_TOOL_JSON_SCHEMA, type FrdDraft } from "../llm/schemas";
import { FRD_SYSTEM_PROMPT, buildFrdUserPrompt } from "../llm/prompts";
import type { BrdContent } from "./brdContent";
import type { DiagramContent } from "../diagramming/diagramContent";
import type { WireframeSetContent } from "../diagramming/wireframeContent";
import type { DevSpecContent } from "../devspec/devSpecContent";

export interface FrdSources {
  brd: BrdContent;
  // Each of these three is optional -- FR-3 generates "once supplied",
  // not only once everything exists. Whichever is null becomes an
  // explicit gap in the generated FRD rather than a silent omission.
  diagram: DiagramContent | null;
  wireframes: WireframeSetContent | null;
  devSpec: DevSpecContent | null;
}

export type GenerateFrdResult =
  | { status: "insufficient_input"; reason: string }
  | { status: "generated"; draft: FrdDraft };

// FR-3: drafts a structured FRD from the BRD plus whichever design-stage
// outputs (User Flow diagram, wireframe options -- the "Diagramming" module
// per FRD Section 5) and developer spec (FR-16/17) have been generated so
// far. Only the BRD is mandatory; a missing design-stage output or dev spec
// is flagged as a gap in the FRD rather than blocking generation entirely
// or being silently skipped.
export async function generateFrd(sources: FrdSources): Promise<GenerateFrdResult> {
  const brdCheck = checkBrdContentInput(sources.brd, "draft an FRD from");
  if (!brdCheck.ok) {
    return { status: "insufficient_input", reason: brdCheck.reason ?? "Input rejected." };
  }

  const rawOutput = await callStructuredTool({
    system: FRD_SYSTEM_PROMPT,
    userPrompt: buildFrdUserPrompt({
      brdTitle: sources.brd.title,
      brdSections: sources.brd.sections,
      diagram: sources.diagram,
      wireframes: sources.wireframes,
      devSpec: sources.devSpec,
    }),
    toolName: "submit_frd_draft",
    toolDescription: "Submit the drafted FRD sections and any flagged gaps.",
    inputSchema: FRD_TOOL_JSON_SCHEMA,
  });

  return { status: "generated", draft: validateFrdDraft(rawOutput) };
}
