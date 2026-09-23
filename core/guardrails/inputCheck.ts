export interface InputCheckResult {
  ok: boolean;
  reason?: string;
}

const MIN_TEXT_LENGTH = 40;

// FR-5 / Reliability NFR: if the input isn't there or isn't usable, the
// caller must be told so explicitly before any LLM call is made — never
// proceed to "generate" content from nothing and hope for the best. Shared
// by every raw-text input guardrail (transcript, dev spec, ...) so the rule
// itself only lives in one place; each caller supplies its own label so the
// reason still says what was actually missing.
function checkNonEmptyText(
  rawText: string | null | undefined,
  label: string
): InputCheckResult {
  if (!rawText || !rawText.trim()) {
    return { ok: false, reason: `No ${label} text was provided.` };
  }
  if (rawText.trim().length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      reason: `${label.charAt(0).toUpperCase()}${label.slice(1)} text is too short (${rawText.trim().length} characters) to work with.`,
    };
  }
  return { ok: true };
}

export function checkTranscriptInput(
  rawText: string | null | undefined
): InputCheckResult {
  return checkNonEmptyText(rawText, "transcript");
}

// FR-8: the pasted "signed-off design and developer specs" input, until
// FR-11/FR-16 exist to produce it automatically.
export function checkDevSpecInput(
  rawText: string | null | undefined
): InputCheckResult {
  return checkNonEmptyText(rawText, "developer spec / design notes");
}

// Same principle as checkTranscriptInput, one link further down the chain:
// FR-7 drafts tickets from a BRD, so if that BRD has no sections yet
// (generation failed, or was never run) say so explicitly instead of
// calling the LLM with nothing to ground a ticket in.
export function checkBrdContentInput(
  brd: { sections: unknown[] } | null | undefined
): InputCheckResult {
  if (!brd || !Array.isArray(brd.sections) || brd.sections.length === 0) {
    return {
      ok: false,
      reason: "The source BRD has no sections to draft tickets from.",
    };
  }
  return { ok: true };
}
