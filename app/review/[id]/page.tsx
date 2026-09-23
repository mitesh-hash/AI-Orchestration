import { notFound } from "next/navigation";
import { getTranscript } from "@/core/db/transcriptRepository";
import { listDocumentsForTranscript } from "@/core/db/documentRepository";
import { listActionItemsForTranscript } from "@/core/db/actionItemRepository";
import { UNSPECIFIED_OWNER } from "@/core/guardrails/ownerNormalization";
import { approveDocumentAction, rejectDocumentAction } from "@/app/actions";
import type { BrdSection, Gap } from "@/core/llm/schemas";

export const dynamic = "force-dynamic";

interface BrdContent {
  title: string;
  sections: BrdSection[];
}

function readBrdContent(content: unknown): BrdContent | null {
  if (
    content &&
    typeof content === "object" &&
    "title" in content &&
    "sections" in content
  ) {
    return content as BrdContent;
  }
  return null;
}

function readGaps(gaps: unknown): Gap[] {
  return Array.isArray(gaps) ? (gaps as Gap[]) : [];
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { warning?: string };
}) {
  const transcript = await getTranscript(params.id);
  if (!transcript) notFound();

  const [documents, actionItems] = await Promise.all([
    listDocumentsForTranscript(params.id),
    listActionItemsForTranscript(params.id),
  ]);
  const brdDocument = documents.find((d) => d.type === "BRD") ?? null;
  const brdContent = brdDocument ? readBrdContent(brdDocument.content) : null;
  const gaps = brdDocument ? readGaps(brdDocument.gaps) : [];

  return (
    <>
      {searchParams.warning && (
        <div className="warning-banner">{searchParams.warning}</div>
      )}

      <div className="card">
        <h2>{transcript.title ?? "(untitled transcript)"}</h2>
        <p className="muted">
          Meeting date: {transcript.meetingDate.toISOString().slice(0, 10)} -- source: {transcript.source}
        </p>
      </div>

      <div className="card">
        <h2>
          First-draft BRD{" "}
          {brdDocument && (
            <span className={`badge badge-${brdDocument.status.toLowerCase()}`}>
              {brdDocument.status.replace("_", " ")}
            </span>
          )}
        </h2>

        {!brdDocument && (
          <p className="muted">
            No BRD was generated for this transcript (see the warning above, if any).
          </p>
        )}

        {brdContent && (
          <>
            <p>
              <strong>{brdContent.title}</strong>
            </p>
            {brdContent.sections.map((section, i) => (
              <div className="section-block" key={i}>
                <h3>{section.heading}</h3>
                <p>{section.text}</p>
                <div className="source-refs">
                  Source references:
                  <ul>
                    {section.sourceRefs.map((ref, j) => (
                      <li key={j}>&ldquo;{ref.quoteOrParaphrase}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {gaps.length > 0 && (
              <div className="gaps-block">
                <strong>Not covered by this transcript (FR-5):</strong>
                <ul>
                  {gaps.map((gap, i) => (
                    <li key={i}>
                      <strong>{gap.section}:</strong> {gap.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {brdDocument && brdDocument.status === "PENDING_APPROVAL" && (
          <form className="actions-row" action={async (formData) => {
            "use server";
            formData.set("documentId", brdDocument.id);
            formData.set("transcriptId", transcript.id);
            const decision = formData.get("decision");
            if (decision === "approve") {
              await approveDocumentAction(formData);
            } else {
              await rejectDocumentAction(formData);
            }
          }}>
            <input
              className="approver-input"
              type="text"
              name="approverName"
              placeholder="Your name"
              required
            />
            <button type="submit" name="decision" value="approve">
              Approve
            </button>
            <button type="submit" name="decision" value="reject" className="secondary">
              Reject
            </button>
          </form>
        )}

        {brdDocument && brdDocument.status === "APPROVED" && (
          <p className="muted">
            Approved by {brdDocument.approvedBy} on{" "}
            {brdDocument.approvedAt?.toISOString().slice(0, 10)}.
          </p>
        )}
        {brdDocument && brdDocument.status === "REJECTED" && (
          <p className="muted">
            Rejected by {brdDocument.approvedBy} on{" "}
            {brdDocument.approvedAt?.toISOString().slice(0, 10)}. Draft retained for
            reference.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Action items</h2>
        {actionItems.length === 0 ? (
          <p className="muted">None extracted for this transcript.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Owner</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {actionItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className={item.owner === UNSPECIFIED_OWNER ? "owner-unspecified" : undefined}>
                    {item.owner}
                  </td>
                  <td>{item.deadline ?? "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
