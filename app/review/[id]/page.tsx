import { notFound } from "next/navigation";
import { getTranscript } from "@/core/db/transcriptRepository";
import { listDocumentsForTranscript } from "@/core/db/documentRepository";
import { listActionItemsForTranscript } from "@/core/db/actionItemRepository";
import { listTicketsForTranscript } from "@/core/db/ticketRepository";
import { listDevSpecNotesForTranscript } from "@/core/db/devSpecNoteRepository";
import { listDiagramsForTranscript } from "@/core/db/diagramRepository";
import { listDesignSystemNotesForTranscript } from "@/core/db/designSystemNoteRepository";
import { listWireframeSetsForTranscript } from "@/core/db/wireframeSetRepository";
import { listComparisonsForTranscript } from "@/core/db/comparisonRepository";
import { listPrototypeExtractionsForTranscript } from "@/core/db/prototypeExtractionRepository";
import { listPrototypeCrossChecksForTranscript } from "@/core/db/prototypeCrossCheckRepository";
import { listDevSpecsForTranscript } from "@/core/db/devSpecRepository";
import { UNSPECIFIED_OWNER } from "@/core/guardrails/ownerNormalization";
import { readBrdContent } from "@/core/documentation/brdContent";
import { readPrototypeContent } from "@/core/comparison/prototypeContent";
import { renderMermaidFlowchart } from "@/core/diagramming/renderMermaid";
import { MermaidDiagram } from "@/app/components/MermaidDiagram";
import {
  approveDocumentAction,
  rejectDocumentAction,
  generateTicketsAction,
  approveTicketAction,
  rejectTicketAction,
  addDevSpecAndGenerateTicketsAction,
  generateDiagramAction,
  approveDiagramAction,
  rejectDiagramAction,
  addDesignSystemNoteAndGenerateWireframesAction,
  approveWireframeSetAction,
  rejectWireframeSetAction,
  generateComparisonAction,
  approveComparisonAction,
  rejectComparisonAction,
  addPrototypeAndExtractAction,
  approvePrototypeExtractionAction,
  rejectPrototypeExtractionAction,
  generatePrototypeCrossCheckAction,
  approvePrototypeCrossCheckAction,
  rejectPrototypeCrossCheckAction,
  generateDevSpecAction,
  approveDevSpecAction,
  rejectDevSpecAction,
} from "@/app/actions";
import {
  PRODUCT_DISCOVERY_MILESTONES,
  type Gap,
  type SourceRef,
  type DiagramNode,
  type DiagramEdge,
  type WireframeOption,
  type ComparisonRow,
  type PrototypeMismatch,
  type DevSpecRule,
} from "@/core/llm/schemas";
import type { Ticket } from "@prisma/client";

export const dynamic = "force-dynamic";

function readGaps(gaps: unknown): Gap[] {
  return Array.isArray(gaps) ? (gaps as Gap[]) : [];
}

function readSourceRefs(sourceRefs: unknown): SourceRef[] {
  return Array.isArray(sourceRefs) ? (sourceRefs as SourceRef[]) : [];
}

interface DiagramContent {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

function readDiagramContent(content: unknown): DiagramContent | null {
  if (content && typeof content === "object" && "nodes" in content && "edges" in content) {
    return content as DiagramContent;
  }
  return null;
}

interface WireframeSetContent {
  options: WireframeOption[];
}

function readWireframeContent(content: unknown): WireframeSetContent | null {
  if (content && typeof content === "object" && "options" in content) {
    return content as WireframeSetContent;
  }
  return null;
}

interface ComparisonContent {
  rows: ComparisonRow[];
}

function readComparisonContent(content: unknown): ComparisonContent | null {
  if (content && typeof content === "object" && "rows" in content) {
    return content as ComparisonContent;
  }
  return null;
}

interface CrossCheckContent {
  mismatches: PrototypeMismatch[];
  notCheckable: Gap[];
}

function readCrossCheckContent(content: unknown): CrossCheckContent | null {
  if (content && typeof content === "object" && "mismatches" in content) {
    return content as CrossCheckContent;
  }
  return null;
}

interface DevSpecContent {
  rules: DevSpecRule[];
  gaps: Gap[];
}

function readDevSpecContent(content: unknown): DevSpecContent | null {
  if (content && typeof content === "object" && "rules" in content) {
    return content as DevSpecContent;
  }
  return null;
}

// Shared by every approvable entity on this page (BRD, tickets, diagram,
// wireframe set, comparison, prototype extraction, cross-check, developer
// spec) -- same status badge, approve/reject form, and approved/rejected
// notice either
// way. The inline server action only closes over the two ids it needs
// (both plain strings), which is what makes it valid to define per item.
function ApprovalControls({
  status,
  idFieldName,
  id,
  transcriptId,
  approvedBy,
  approvedAt,
  approveAction,
  rejectAction,
}: {
  status: string;
  idFieldName: string;
  id: string;
  transcriptId: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
}) {
  if (status === "PENDING_APPROVAL") {
    return (
      <form
        className="actions-row"
        action={async (formData) => {
          "use server";
          formData.set(idFieldName, id);
          formData.set("transcriptId", transcriptId);
          const decision = formData.get("decision");
          if (decision === "approve") {
            await approveAction(formData);
          } else {
            await rejectAction(formData);
          }
        }}
      >
        <input className="approver-input" type="text" name="approverName" placeholder="Your name" required />
        <button type="submit" name="decision" value="approve">
          Approve
        </button>
        <button type="submit" name="decision" value="reject" className="secondary">
          Reject
        </button>
      </form>
    );
  }
  if (status === "APPROVED") {
    return (
      <p className="muted">
        Approved by {approvedBy} on {approvedAt?.toISOString().slice(0, 10)}.
      </p>
    );
  }
  if (status === "REJECTED") {
    return (
      <p className="muted">
        Rejected by {approvedBy} on {approvedAt?.toISOString().slice(0, 10)}.
      </p>
    );
  }
  return null;
}

// Shared by both the Product Discovery and Development ticket lists.
function TicketCard({ ticket, transcriptId, sourceLabel }: {
  ticket: Ticket;
  transcriptId: string;
  sourceLabel: string;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p>
        <strong>{ticket.title}</strong>{" "}
        <span className={`badge badge-${ticket.status.toLowerCase()}`}>
          {ticket.status.replace("_", " ")}
        </span>
      </p>
      <p>{ticket.description}</p>
      <div className="source-refs">
        {sourceLabel}:
        <ul>
          {readSourceRefs(ticket.sourceRefs).map((ref, j) => (
            <li key={j}>&ldquo;{ref.quoteOrParaphrase}&rdquo;</li>
          ))}
        </ul>
      </div>
      <ApprovalControls
        status={ticket.status}
        idFieldName="ticketId"
        id={ticket.id}
        transcriptId={transcriptId}
        approvedBy={ticket.approvedBy}
        approvedAt={ticket.approvedAt}
        approveAction={approveTicketAction}
        rejectAction={rejectTicketAction}
      />
    </div>
  );
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

  const [
    documents,
    actionItems,
    tickets,
    devSpecNotes,
    diagrams,
    designSystemNotes,
    wireframeSets,
    comparisons,
    prototypeExtractions,
    prototypeCrossChecks,
    devSpecs,
  ] = await Promise.all([
    listDocumentsForTranscript(params.id),
    listActionItemsForTranscript(params.id),
    listTicketsForTranscript(params.id),
    listDevSpecNotesForTranscript(params.id),
    listDiagramsForTranscript(params.id),
    listDesignSystemNotesForTranscript(params.id),
    listWireframeSetsForTranscript(params.id),
    listComparisonsForTranscript(params.id),
    listPrototypeExtractionsForTranscript(params.id),
    listPrototypeCrossChecksForTranscript(params.id),
    listDevSpecsForTranscript(params.id),
  ]);
  const brdDocument = documents.find((d) => d.type === "BRD") ?? null;
  const brdContent = brdDocument ? readBrdContent(brdDocument.content) : null;
  const gaps = brdDocument ? readGaps(brdDocument.gaps) : [];
  const productDiscoveryTickets = tickets.filter((t) => t.type === "PRODUCT_DISCOVERY");
  const developmentTickets = tickets.filter((t) => t.type === "DEVELOPMENT");
  const diagram = diagrams[0] ?? null;
  const diagramContent = diagram ? readDiagramContent(diagram.content) : null;
  const diagramGaps = diagram ? readGaps(diagram.gaps) : [];

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

            {productDiscoveryTickets.length === 0 && (
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

        {brdDocument && (
          <ApprovalControls
            status={brdDocument.status}
            idFieldName="documentId"
            id={brdDocument.id}
            transcriptId={transcript.id}
            approvedBy={brdDocument.approvedBy}
            approvedAt={brdDocument.approvedAt}
            approveAction={approveDocumentAction}
            rejectAction={rejectDocumentAction}
          />
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

      {productDiscoveryTickets.length > 0 && (
        <div className="card">
          <h2>Product Discovery tickets</h2>
          <p className="muted">
            Drafts only (FR-9) -- copy approved tickets into Jira by hand. Nothing
            here has been sent anywhere.
          </p>
          {PRODUCT_DISCOVERY_MILESTONES.map((milestone) => {
            const milestoneTickets = productDiscoveryTickets.filter((t) => t.milestone === milestone);
            if (milestoneTickets.length === 0) return null;
            return (
              <div className="section-block" key={milestone}>
                <h3>{milestone}</h3>
                {milestoneTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    transcriptId={transcript.id}
                    sourceLabel="From the BRD"
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2>Developer specs / design notes (FR-8)</h2>
        <p className="muted">
          Paste signed-off design notes or developer specs (validations, business
          rules, error/success messages) to draft development/technical tickets --
          kept separate from Product Discovery tickets above. There&apos;s no
          automated design/dev-spec generation yet (that&apos;s a later slice), so
          this is pasted in directly for now.
        </p>

        {devSpecNotes.map((note) => (
          <div className="section-block" key={note.id}>
            <h3>{note.title ?? "(untitled spec note)"}</h3>
            <p className="muted">{note.rawText}</p>
          </div>
        ))}

        <form action={addDevSpecAndGenerateTicketsAction}>
          <input type="hidden" name="transcriptId" value={transcript.id} />
          <label htmlFor="devSpecTitle">Title (optional)</label>
          <input type="text" id="devSpecTitle" name="title" placeholder="e.g. Cart page validations" />
          <label htmlFor="devSpecText">Developer specs / design notes</label>
          <textarea
            id="devSpecText"
            name="rawText"
            required
            placeholder="Paste signed-off design notes or developer specs here..."
          />
          <div className="actions-row">
            <button type="submit">Generate development tickets</button>
          </div>
        </form>
      </div>

      {developmentTickets.length > 0 && (
        <div className="card">
          <h2>Development tickets</h2>
          <p className="muted">
            Drafts only (FR-9) -- copy approved tickets into Jira by hand. Kept
            separate from Product Discovery tickets (FR-8).
          </p>
          {developmentTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              transcriptId={transcript.id}
              sourceLabel="From the spec/design notes"
            />
          ))}
        </div>
      )}

      <div className="card">
        <h2>
          User Flow diagram (FR-10){" "}
          {diagram && (
            <span className={`badge badge-${diagram.status.toLowerCase()}`}>
              {diagram.status.replace("_", " ")}
            </span>
          )}
        </h2>
        <p className="muted">
          Derived from the BRD above -- each step cites the BRD text it came
          from, and any part of the process the BRD doesn&apos;t describe is
          left out and flagged rather than guessed.
        </p>

        {!diagram && brdContent && (
          <form
            className="actions-row"
            action={async () => {
              "use server";
              const formData = new FormData();
              formData.set("documentId", brdDocument!.id);
              formData.set("transcriptId", transcript.id);
              await generateDiagramAction(formData);
            }}
          >
            <button type="submit">Generate User Flow diagram</button>
          </form>
        )}
        {!diagram && !brdContent && (
          <p className="muted">Generate a BRD first -- the diagram is derived from it.</p>
        )}

        {diagramContent && (
          <>
            <MermaidDiagram
              id={`diagram-${diagram!.id}`}
              chart={renderMermaidFlowchart(diagramContent.nodes, diagramContent.edges)}
            />
            {diagramGaps.length > 0 && (
              <div className="gaps-block">
                <strong>Not covered by the BRD (FR-5):</strong>
                <ul>
                  {diagramGaps.map((gap, i) => (
                    <li key={i}>
                      <strong>{gap.section}:</strong> {gap.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {diagram && (
          <ApprovalControls
            status={diagram.status}
            idFieldName="diagramId"
            id={diagram.id}
            transcriptId={transcript.id}
            approvedBy={diagram.approvedBy}
            approvedAt={diagram.approvedAt}
            approveAction={approveDiagramAction}
            rejectAction={rejectDiagramAction}
          />
        )}
      </div>

      <div className="card">
        <h2>Wireframe options (FR-11)</h2>
        <p className="muted">
          Paste a description of the team&apos;s existing design system
          (component styles, patterns) to draft 2-3 rough wireframe options
          grounded in it and in the BRD above -- kept deliberately rough, not
          pixel-precise mockups. There&apos;s no design-system integration yet
          (that&apos;s a later slice), so this is pasted in directly for now.
        </p>

        {designSystemNotes.map((note) => (
          <div className="section-block" key={note.id}>
            <h3>{note.title ?? "(untitled design system note)"}</h3>
            <p className="muted">{note.rawText}</p>
          </div>
        ))}

        {brdContent ? (
          <form action={addDesignSystemNoteAndGenerateWireframesAction}>
            <input type="hidden" name="transcriptId" value={transcript.id} />
            <input type="hidden" name="documentId" value={brdDocument!.id} />
            <label htmlFor="designSystemTitle">Title (optional)</label>
            <input
              type="text"
              id="designSystemTitle"
              name="title"
              placeholder="e.g. Core design system v2"
            />
            <label htmlFor="designSystemText">Design system notes</label>
            <textarea
              id="designSystemText"
              name="rawText"
              required
              placeholder="Paste a description of your design system's components and patterns..."
            />
            <div className="actions-row">
              <button type="submit">Generate wireframe options</button>
            </div>
          </form>
        ) : (
          <p className="muted">Generate a BRD first -- wireframes need it for requirements.</p>
        )}
      </div>

      {wireframeSets.map((set) => {
        const content = readWireframeContent(set.content);
        const setGaps = readGaps(set.gaps);
        if (!content) return null;
        return (
          <div className="card" key={set.id}>
            <h2>
              Wireframe options{" "}
              <span className={`badge badge-${set.status.toLowerCase()}`}>
                {set.status.replace("_", " ")}
              </span>
            </h2>
            {content.options.map((option, i) => (
              <div className="section-block" key={i}>
                <h3>{option.name}</h3>
                <div className="wireframe-stack">
                  {option.regions.map((region, j) => (
                    <div className={`wireframe-region wireframe-region-${region.kind}`} key={j}>
                      <span className="wireframe-region-kind">{region.kind}</span>
                      {region.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {setGaps.length > 0 && (
              <div className="gaps-block">
                <strong>Not specified (FR-5):</strong>
                <ul>
                  {setGaps.map((gap, i) => (
                    <li key={i}>
                      <strong>{gap.section}:</strong> {gap.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ApprovalControls
              status={set.status}
              idFieldName="wireframeSetId"
              id={set.id}
              transcriptId={transcript.id}
              approvedBy={set.approvedBy}
              approvedAt={set.approvedAt}
              approveAction={approveWireframeSetAction}
              rejectAction={rejectWireframeSetAction}
            />
          </div>
        );
      })}

      <div className="card">
        <h2>Comparison (FR-12/13)</h2>
        <p className="muted">
          Paste any two versions of a document, design description, or
          feedback to diff them -- side by side, topic by topic. A genuine
          contradiction is flagged explicitly rather than resolved in favor
          of either side.
        </p>

        <form action={generateComparisonAction}>
          <input type="hidden" name="transcriptId" value={transcript.id} />
          <label htmlFor="labelA">Version A label (optional)</label>
          <input type="text" id="labelA" name="labelA" placeholder="e.g. BRD draft 1" />
          <label htmlFor="textA">Version A text</label>
          <textarea id="textA" name="textA" required placeholder="Paste version A here..." />
          <label htmlFor="labelB">Version B label (optional)</label>
          <input type="text" id="labelB" name="labelB" placeholder="e.g. BRD draft 2 after client call" />
          <label htmlFor="textB">Version B text</label>
          <textarea id="textB" name="textB" required placeholder="Paste version B here..." />
          <div className="actions-row">
            <button type="submit">Compare</button>
          </div>
        </form>
      </div>

      {comparisons.map((comparison) => {
        const content = readComparisonContent(comparison.content);
        return (
          <div className="card" key={comparison.id}>
            <h2>
              {comparison.labelA ?? "Version A"} vs {comparison.labelB ?? "Version B"}{" "}
              <span className={`badge badge-${comparison.status.toLowerCase()}`}>
                {comparison.status.replace("_", " ")}
              </span>
            </h2>

            {!content && (
              <p className="muted">No comparison generated yet (see the warning above, if any).</p>
            )}

            {content && (
              <table>
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>{comparison.labelA ?? "Version A"}</th>
                    <th>{comparison.labelB ?? "Version B"}</th>
                    <th>Conflict?</th>
                  </tr>
                </thead>
                <tbody>
                  {content.rows.map((row, i) => (
                    <tr key={i} className={row.isConflict ? "conflict-row" : undefined}>
                      <td>{row.topic}</td>
                      <td>{row.aSummary}</td>
                      <td>{row.bSummary}</td>
                      <td>{row.isConflict ? <span className="badge badge-rejected">CONFLICT</span> : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <ApprovalControls
              status={comparison.status}
              idFieldName="comparisonId"
              id={comparison.id}
              transcriptId={transcript.id}
              approvedBy={comparison.approvedBy}
              approvedAt={comparison.approvedAt}
              approveAction={approveComparisonAction}
              rejectAction={rejectComparisonAction}
            />
          </div>
        );
      })}

      <div className="card">
        <h2>Prototype structure (FR-14)</h2>
        <p className="muted">
          Paste the HTML of a frozen/signed-off prototype to extract its
          structure for documentation. Pasted as raw HTML text -- there&apos;s
          no file upload in this slice. Every extracted element cites the
          actual HTML snippet it came from.
        </p>

        {prototypeExtractions.map((extraction) => {
          const content = readPrototypeContent(extraction.content);
          return (
            <div className="section-block" key={extraction.id}>
              <h3>
                {extraction.title ?? "(untitled prototype)"}{" "}
                <span className={`badge badge-${extraction.status.toLowerCase()}`}>
                  {extraction.status.replace("_", " ")}
                </span>
              </h3>

              {!content && (
                <p className="muted">Not extracted yet (see the warning above, if any).</p>
              )}

              {content &&
                content.sections.map((section, i) => (
                  <div key={i} style={{ marginBottom: "0.75rem" }}>
                    <strong>{section.name}</strong>
                    <ul>
                      {section.elements.map((el, j) => (
                        <li key={j}>
                          [{el.kind}] {el.label}
                          {el.details ? ` (${el.details})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

              <ApprovalControls
                status={extraction.status}
                idFieldName="prototypeExtractionId"
                id={extraction.id}
                transcriptId={transcript.id}
                approvedBy={extraction.approvedBy}
                approvedAt={extraction.approvedAt}
                approveAction={approvePrototypeExtractionAction}
                rejectAction={rejectPrototypeExtractionAction}
              />

              {content && brdContent && (
                <div className="actions-row">
                  <form
                    action={async () => {
                      "use server";
                      const formData = new FormData();
                      formData.set("documentId", brdDocument!.id);
                      formData.set("prototypeExtractionId", extraction.id);
                      formData.set("transcriptId", transcript.id);
                      await generatePrototypeCrossCheckAction(formData);
                    }}
                  >
                    <button type="submit">Cross-check against BRD (FR-15)</button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      const formData = new FormData();
                      formData.set("documentId", brdDocument!.id);
                      formData.set("prototypeExtractionId", extraction.id);
                      formData.set("transcriptId", transcript.id);
                      await generateDevSpecAction(formData);
                    }}
                  >
                    <button type="submit">Generate developer spec (FR-16/17)</button>
                  </form>
                </div>
              )}
              {content && !brdContent && (
                <p className="muted">
                  Generate a BRD first to cross-check or generate developer specs against
                  this prototype.
                </p>
              )}
            </div>
          );
        })}

        <form action={addPrototypeAndExtractAction}>
          <input type="hidden" name="transcriptId" value={transcript.id} />
          <label htmlFor="prototypeTitle">Title (optional)</label>
          <input type="text" id="prototypeTitle" name="title" placeholder="e.g. Checkout prototype v3" />
          <label htmlFor="prototypeHtml">Prototype HTML</label>
          <textarea
            id="prototypeHtml"
            name="rawHtml"
            required
            placeholder="Paste the prototype's HTML source here..."
          />
          <div className="actions-row">
            <button type="submit">Extract structure</button>
          </div>
        </form>
      </div>

      {prototypeCrossChecks.length > 0 && (
        <div className="card">
          <h2>Prototype cross-check (FR-15)</h2>
          <div className="warning-banner">
            Scope: this only checks static structure and visible content
            (labels, presence of elements, markup attributes) against what
            the BRD documents. It does NOT verify runtime/interactive
            behavior (click handlers, API calls, dynamic state) -- nothing in
            this tool executes the prototype.
          </div>

          {prototypeCrossChecks.map((crossCheck) => {
            const content = readCrossCheckContent(crossCheck.content);
            if (!content) return null;
            return (
              <div className="section-block" key={crossCheck.id}>
                <h3>
                  <span className={`badge badge-${crossCheck.status.toLowerCase()}`}>
                    {crossCheck.status.replace("_", " ")}
                  </span>
                </h3>

                {content.mismatches.length === 0 ? (
                  <p className="muted">No mismatches found.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th>Documented</th>
                        <th>Prototype shows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.mismatches.map((m, i) => (
                        <tr key={i}>
                          <td>{m.topic}</td>
                          <td>{m.documented}</td>
                          <td>{m.prototypeShows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {content.notCheckable.length > 0 && (
                  <div className="gaps-block">
                    <strong>Not checkable from static structure:</strong>
                    <ul>
                      {content.notCheckable.map((gap, i) => (
                        <li key={i}>
                          <strong>{gap.section}:</strong> {gap.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <ApprovalControls
                  status={crossCheck.status}
                  idFieldName="crossCheckId"
                  id={crossCheck.id}
                  transcriptId={transcript.id}
                  approvedBy={crossCheck.approvedBy}
                  approvedAt={crossCheck.approvedAt}
                  approveAction={approvePrototypeCrossCheckAction}
                  rejectAction={rejectPrototypeCrossCheckAction}
                />
              </div>
            );
          })}
        </div>
      )}

      {devSpecs.map((devSpec) => {
        const content = readDevSpecContent(devSpec.content);
        if (!content) return null;
        const rulesByType: { type: DevSpecRule["type"]; label: string }[] = [
          { type: "validation", label: "Validations" },
          { type: "business_rule", label: "Business Rules" },
          { type: "message", label: "Error / Success Messages" },
        ];
        return (
          <div className="card" key={devSpec.id}>
            <h2>
              Developer Spec (FR-16/17){" "}
              <span className={`badge badge-${devSpec.status.toLowerCase()}`}>
                {devSpec.status.replace("_", " ")}
              </span>
            </h2>
            <p className="muted">
              Generated from the BRD and the extracted prototype above. A rule
              not explicitly stated in either source is marked{" "}
              <strong>needs confirmation</strong> rather than presented as
              final (FR-17).
            </p>

            {rulesByType.map(({ type, label }) => {
              const rules = content.rules.filter((r) => r.type === type);
              if (rules.length === 0) return null;
              return (
                <div className="section-block" key={type}>
                  <h3>{label}</h3>
                  {rules.map((rule, i) => (
                    <div key={i} style={{ marginBottom: "0.75rem" }}>
                      <p>
                        {rule.description}{" "}
                        {rule.needsConfirmation ? (
                          <span className="badge badge-rejected">NEEDS CONFIRMATION</span>
                        ) : (
                          <span className="badge badge-approved">CONFIRMED</span>
                        )}
                      </p>
                      <div className="source-refs">
                        Source references:
                        <ul>
                          {readSourceRefs(rule.sourceRefs).map((ref, j) => (
                            <li key={j}>&ldquo;{ref.quoteOrParaphrase}&rdquo;</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {content.gaps.length > 0 && (
              <div className="gaps-block">
                <strong>No basis to draft a rule at all:</strong>
                <ul>
                  {content.gaps.map((gap, i) => (
                    <li key={i}>
                      <strong>{gap.section}:</strong> {gap.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ApprovalControls
              status={devSpec.status}
              idFieldName="devSpecId"
              id={devSpec.id}
              transcriptId={transcript.id}
              approvedBy={devSpec.approvedBy}
              approvedAt={devSpec.approvedAt}
              approveAction={approveDevSpecAction}
              rejectAction={rejectDevSpecAction}
            />
          </div>
        );
      })}
    </>
  );
}
