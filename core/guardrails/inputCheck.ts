export interface InputCheckResult {
  ok: boolean;
  reason?: string;
}

const MIN_TRANSCRIPT_LENGTH = 40;

// FR-5 / Reliability NFR: if the input isn't there or isn't usable, the
// caller must be told so explicitly before any LLM call is made — never
// proceed to "generate" content from nothing and hope for the best.
export function checkTranscriptInput(
  rawText: string | null | undefined
): InputCheckResult {
  if (!rawText || !rawText.trim()) {
    return { ok: false, reason: "No transcript text was provided." };
  }
  if (rawText.trim().length < MIN_TRANSCRIPT_LENGTH) {
    return {
      ok: false,
      reason: `Transcript is too short (${rawText.trim().length} characters) to reliably draft a BRD or extract action items from.`,
    };
  }
  return { ok: true };
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
