export interface InputCheckResult {
  ok: boolean;
  reason?: string;
}

const MIN_TEXT_LENGTH = 40;

// FR-5 / Reliability NFR: if the input isn't there or isn't usable, the
// caller must be told so explicitly before any LLM call is made — never
// proceed to "generate" content from nothing and hope for the best. Shared
// by every raw-text input guardrail (transcript, dev spec, comparison
// texts, prototype HTML, ...) so the rule itself only lives in one place;
// exported directly (rather than adding another one-line wrapper per
// caller) once a label is dynamic per call site, e.g. "Version A text".
export function checkNonEmptyText(
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

// FR-11: the pasted "existing design system" reference input.
export function checkDesignSystemInput(
  rawText: string | null | undefined
): InputCheckResult {
  return checkNonEmptyText(rawText, "design system notes");
}

function checkHasSections(
  subject: { sections: unknown[] } | null | undefined,
  subjectLabel: string,
  purpose: string
): InputCheckResult {
  if (!subject || !Array.isArray(subject.sections) || subject.sections.length === 0) {
    return {
      ok: false,
      reason: `${subjectLabel} has no sections to ${purpose}.`,
    };
  }
  return { ok: true };
}

// Same principle as checkTranscriptInput, one link further down the chain:
// FR-7/FR-10/FR-11 all draft something from a BRD, so if that BRD has no
// sections yet (generation failed, or was never run) say so explicitly
// instead of calling the LLM with nothing to ground anything in.
export function checkBrdContentInput(
  brd: { sections: unknown[] } | null | undefined,
  purpose = "draft tickets from"
): InputCheckResult {
  return checkHasSections(brd, "The source BRD", purpose);
}

// FR-15: cross-checking needs an already-extracted prototype structure to
// compare against -- same principle, one link down the FR-14 chain instead.
export function checkPrototypeStructureInput(
  structure: { sections: unknown[] } | null | undefined,
  purpose = "cross-check against"
): InputCheckResult {
  return checkHasSections(structure, "The prototype extraction", purpose);
}
