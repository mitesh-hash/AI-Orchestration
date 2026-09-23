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
