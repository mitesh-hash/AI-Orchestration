import { notFound } from "next/navigation";
import { getTranscript } from "@/core/db/transcriptRepository";
import { listDocumentsForTranscript } from "@/core/db/documentRepository";
import { listActionItemsForTranscript } from "@/core/db/actionItemRepository";
import { listTicketsForDocument } from "@/core/db/ticketRepository";
import { UNSPECIFIED_OWNER } from "@/core/guardrails/ownerNormalization";
import { readBrdContent } from "@/core/documentation/brdContent";
import {
  approveDocumentAction,
  rejectDocumentAction,
  generateTicketsAction,
  approveTicketAction,
  rejectTicketAction,
} from "@/app/actions";
import { PRODUCT_DISCOVERY_MILESTONES, type Gap, type SourceRef } from "@/core/llm/schemas";

export const dynamic = "force-dynamic";

function readGaps(gaps: unknown): Gap[] {
  return Array.isArray(gaps) ? (gaps as Gap[]) : [];
}

function readSourceRefs(sourceRefs: unknown): SourceRef[] {
  return Array.isArray(sourceRefs) ? (sourceRefs as SourceRef[]) : [];
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
  const tickets = brdDocument ? await listTicketsForDocument(brdDocument.id) : [];

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

            {tickets.length === 0 && (
              <form
                className="actions-row"
                action={async () => {
                  "use server";
                  const formData = new FormData();
                  formData.set("documentId", brdDocument!.id);
                  formData.set("transcriptId", transcript.id);
                  await generateTicketsAction(formData);
                }}
              >
                <button type="submit">Generate Product Discovery tickets</button>
              </form>
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

      {tickets.length > 0 && (
        <div className="card">
          <h2>Product Discovery tickets</h2>
          <p className="muted">
            Drafts only (FR-9) -- copy approved tickets into Jira by hand. Nothing
            here has been sent anywhere.
          </p>
          {PRODUCT_DISCOVERY_MILESTONES.map((milestone) => {
            const milestoneTickets = tickets.filter((t) => t.milestone === milestone);
            if (milestoneTickets.length === 0) return null;
            return (
              <div className="section-block" key={milestone}>
                <h3>{milestone}</h3>
                {milestoneTickets.map((ticket) => (
                  <div key={ticket.id} style={{ marginBottom: "1rem" }}>
                    <p>
                      <strong>{ticket.title}</strong>{" "}
                      <span className={`badge badge-${ticket.status.toLowerCase()}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </p>
                    <p>{ticket.description}</p>
                    <div className="source-refs">
                      From the BRD:
                      <ul>
                        {readSourceRefs(ticket.sourceRefs).map((ref, j) => (
                          <li key={j}>&ldquo;{ref.quoteOrParaphrase}&rdquo;</li>
                        ))}
                      </ul>
                    </div>

                    {ticket.status === "PENDING_APPROVAL" && (
                      <form
                        className="actions-row"
                        action={async (formData) => {
                          "use server";
                          formData.set("ticketId", ticket.id);
                          formData.set("transcriptId", transcript.id);
                          const decision = formData.get("decision");
                          if (decision === "approve") {
                            await approveTicketAction(formData);
                          } else {
                            await rejectTicketAction(formData);
                          }
                        }}
                      >
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
                        <button
                          type="submit"
                          name="decision"
                          value="reject"
                          className="secondary"
                        >
                          Reject
                        </button>
                      </form>
                    )}
                    {ticket.status === "APPROVED" && (
                      <p className="muted">
                        Approved by {ticket.approvedBy} on{" "}
                        {ticket.approvedAt?.toISOString().slice(0, 10)}.
                      </p>
                    )}
                    {ticket.status === "REJECTED" && (
                      <p className="muted">
                        Rejected by {ticket.approvedBy} on{" "}
                        {ticket.approvedAt?.toISOString().slice(0, 10)}.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
