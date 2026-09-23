import { listTranscripts } from "@/core/db/transcriptRepository";
import { processTranscriptAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const transcripts = await listTranscripts();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="card">
        <h2>New transcript</h2>
        <p className="muted">
          Paste a meeting transcript below. This generates a first-draft BRD with
          per-section source citations and an action-item table -- both shown on a
          review screen where you approve or reject them. Nothing is sent anywhere
          automatically.
        </p>
        <form action={processTranscriptAction}>
          <label htmlFor="title">Title (optional)</label>
          <input type="text" id="title" name="title" placeholder="e.g. Checkout redesign kickoff" />

          <label htmlFor="meetingDate">Meeting date</label>
          <input type="date" id="meetingDate" name="meetingDate" defaultValue={today} required />

          <label htmlFor="rawText">Transcript text</label>
          <textarea
            id="rawText"
            name="rawText"
            required
            placeholder="Paste the raw meeting transcript here..."
          />

          <div className="actions-row">
            <button type="submit">Generate BRD + action items</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Previous transcripts</h2>
        {transcripts.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <div className="transcript-list">
            {transcripts.map((t) => (
              <a key={t.id} href={`/review/${t.id}`}>
                {t.title ?? "(untitled)"} -- {t.meetingDate.toISOString().slice(0, 10)}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
