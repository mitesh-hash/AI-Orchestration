import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/core/transcripts/googleDocsClient", () => ({
  getGoogleDocsClient: vi.fn(),
}));

import { getGoogleDocsClient } from "@/core/transcripts/googleDocsClient";
import {
  extractGoogleDocId,
  fetchGoogleDocTranscript,
} from "@/core/transcripts/fetchGoogleDocTranscript";

const mockedGetClient = vi.mocked(getGoogleDocsClient);

beforeEach(() => {
  mockedGetClient.mockReset();
});

describe("extractGoogleDocId", () => {
  it("extracts the document id from a canonical edit URL", () => {
    expect(
      extractGoogleDocId("https://docs.google.com/document/d/1AbC-23_xyz/edit")
    ).toBe("1AbC-23_xyz");
  });

  it("extracts the document id from a share URL with query params and a tab fragment", () => {
    expect(
      extractGoogleDocId(
        "https://docs.google.com/document/d/1AbC-23_xyz/edit?usp=drive_web&tab=t.0"
      )
    ).toBe("1AbC-23_xyz");
  });

  it("tolerates surrounding whitespace", () => {
    expect(extractGoogleDocId("  https://docs.google.com/document/d/abc123/edit  ")).toBe(
      "abc123"
    );
  });

  it("returns null for plain transcript text", () => {
    expect(extractGoogleDocId("PM: let's discuss the checkout redesign...")).toBeNull();
  });

  it("returns null for an unrelated URL", () => {
    expect(extractGoogleDocId("https://example.com/document/d/abc123")).toBeNull();
  });
});

describe("fetchGoogleDocTranscript (FR-1)", () => {
  it("returns an error without calling the client when the input isn't a Google Doc URL", async () => {
    const result = await fetchGoogleDocTranscript("just some pasted text");
    expect(result.status).toBe("error");
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it("extracts plain text from the document's paragraphs, joins them with newlines", async () => {
    const documentsGet = vi.fn().mockResolvedValue({
      data: {
        title: "Checkout Redesign Kickoff",
        body: {
          content: [
            {
              paragraph: {
                elements: [{ textRun: { content: "First paragraph.\n" } }],
              },
            },
            {
              paragraph: {
                elements: [
                  { textRun: { content: "Second " } },
                  { textRun: { content: "paragraph.\n" } },
                ],
              },
            },
          ],
        },
      },
    });
    mockedGetClient.mockReturnValue({ documents: { get: documentsGet } } as never);

    const result = await fetchGoogleDocTranscript(
      "https://docs.google.com/document/d/abc123/edit"
    );

    expect(result.status).toBe("fetched");
    if (result.status === "fetched") {
      expect(result.title).toBe("Checkout Redesign Kickoff");
      expect(result.text).toBe("First paragraph.\nSecond paragraph.");
    }
    expect(documentsGet).toHaveBeenCalledWith({ documentId: "abc123" });
  });

  it("returns an error when the document has no readable text content", async () => {
    mockedGetClient.mockReturnValue({
      documents: { get: vi.fn().mockResolvedValue({ data: { title: "Empty doc", body: { content: [] } } }) },
    } as never);

    const result = await fetchGoogleDocTranscript(
      "https://docs.google.com/document/d/abc123/edit"
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toMatch(/no readable text/);
    }
  });

  it("surfaces the API's own error message instead of throwing or fabricating content", async () => {
    mockedGetClient.mockReturnValue({
      documents: {
        get: vi.fn().mockRejectedValue(new Error("The caller does not have permission")),
      },
    } as never);

    const result = await fetchGoogleDocTranscript(
      "https://docs.google.com/document/d/abc123/edit"
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("The caller does not have permission");
    }
  });

  it("surfaces a missing-credentials error from getGoogleDocsClient the same way", async () => {
    mockedGetClient.mockImplementation(() => {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set.");
    });

    const result = await fetchGoogleDocTranscript(
      "https://docs.google.com/document/d/abc123/edit"
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toMatch(/GOOGLE_SERVICE_ACCOUNT_KEY/);
    }
  });
});
