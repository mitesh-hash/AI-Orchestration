import { google, docs_v1 } from "googleapis";

// Mirrors core/llm/client.ts's fail-fast pattern: refuse to call the API
// without credentials rather than failing confusingly deeper in the stack.
// There's no per-user OAuth flow in this app (confirmed with the user,
// consistent with the existing "single internal user" assumption) -- the
// app authenticates as one service account, and a transcript Doc has to be
// shared with that account's own email (its `client_email`) as a Viewer.
let client: docs_v1.Docs | null = null;

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

function parseCredentials(rawKey: string): ServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawKey);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the full contents " +
        "of the service account key file as a single-line string."
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).client_email !== "string" ||
    typeof (parsed as Record<string, unknown>).private_key !== "string"
  ) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email/private_key -- " +
        "make sure it's the full service account key JSON, not a partial copy."
    );
  }

  return parsed as ServiceAccountCredentials;
}

export function getGoogleDocsClient(): docs_v1.Docs {
  if (client) return client;

  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not set. Refusing to call the Google " +
        "Docs API without it rather than failing in a confusing way deeper " +
        "in the stack."
    );
  }

  const credentials = parseCredentials(rawKey);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/documents.readonly"],
  });

  client = google.docs({ version: "v1", auth });
  return client;
}
