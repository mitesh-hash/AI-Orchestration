import type { docs_v1 } from "googleapis";
import { getGoogleDocsClient } from "./googleDocsClient";

const GOOGLE_DOC_URL_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;

// FR-1: "...or Google Doc link" -- a BA pastes a Google Doc URL into the
// same field used for pasting transcript text (confirmed with the user, in
// place of a separate upload/import control). Only the doc's own canonical
// URL shape is recognized; anything else is literal transcript text as far
// as the caller is concerned.
export function extractGoogleDocId(input: string): string | null {
  const match = input.trim().match(GOOGLE_DOC_URL_PATTERN);
  return match?.[1] ?? null;
}

export type FetchGoogleDocResult =
  | { status: "fetched"; title: string; text: string }
  | { status: "error"; reason: string };

function extractPlainText(document: docs_v1.Schema$Document): string {
  const content = document.body?.content ?? [];
  const paragraphs: string[] = [];

  for (const element of content) {
    const elements = element.paragraph?.elements ?? [];
    const paragraphText = elements.map((el) => el.textRun?.content ?? "").join("");
    if (paragraphText.trim().length > 0) {
      paragraphs.push(paragraphText.replace(/\n+$/, ""));
    }
  }

  return paragraphs.join("\n");
}

function describeGoogleApiError(err: unknown): string {
  // Google's client errors usually already carry the useful detail (e.g.
  // "File not found" / "The caller does not have permission") -- surfaced
  // as-is rather than behind a generic wrapper, so a sharing/auth mistake
  // is actually diagnosable from the warning banner instead of server logs.
  if (err instanceof Error) return err.message;
  return "Unknown error while contacting the Google Docs API.";
}

// Fetches a Google Doc's plain text via the Docs API. Never fabricates or
// guesses at content on failure (missing credentials, doc not shared, doc
// deleted, doc genuinely empty) -- every failure mode returns an explicit,
// diagnosable reason instead of throwing or returning empty text silently.
export async function fetchGoogleDocTranscript(url: string): Promise<FetchGoogleDocResult> {
  const documentId = extractGoogleDocId(url);
  if (!documentId) {
    return { status: "error", reason: "Not a recognizable Google Doc URL." };
  }

  try {
    const docs = getGoogleDocsClient();
    const response = await docs.documents.get({ documentId });
    const document = response.data;
    const text = extractPlainText(document).trim();

    if (!text) {
      return { status: "error", reason: "The Google Doc has no readable text content." };
    }

    return { status: "fetched", title: document.title ?? "(untitled Google Doc)", text };
  } catch (err) {
    return { status: "error", reason: describeGoogleApiError(err) };
  }
}
