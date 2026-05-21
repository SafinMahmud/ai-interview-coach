import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import type { SessionHistory, SessionSummary } from "@/types";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyBySession, setHistoryBySession] = useState<
    Record<string, SessionHistory>
  >({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  async function toggleTranscripts(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(sessionId);
    if (historyBySession[sessionId]) return;

    setLoadingHistory(sessionId);
    setError(null);
    try {
      const history = await api.sessionHistory(sessionId);
      setHistoryBySession((prev) => ({ ...prev, [sessionId]: history }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transcripts");
      setExpandedId(null);
    } finally {
      setLoadingHistory(null);
    }
  }

  if (loading) return <p>Loading history...</p>;

  return (
    <div>
      <h1>Session history</h1>
      <p>Compare past practice runs and average scores.</p>
      {error && <p className="error">{error}</p>}
      {sessions.length === 0 ? (
        <p>
          No sessions yet. <Link to="/">Start your first interview</Link>.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sessions.map((s) => {
            const history = historyBySession[s.id];
            const isOpen = expandedId === s.id;
            const hasAnswers = history?.questions.some((q) => q.answers.length > 0);

            return (
              <li key={s.id} className="card">
                <strong>{s.company_name ?? "General practice"}</strong>
                <p style={{ color: "#64748b", margin: "0.25rem 0" }}>
                  {s.jd_preview}
                </p>
                <p>
                  {s.question_count} questions ·{" "}
                  {s.avg_score != null
                    ? `Avg score ${s.avg_score}/10`
                    : "Not evaluated yet"}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Link to={`/interview/${s.id}`}>Continue</Link>
                  <button
                    type="button"
                    className="secondary"
                    disabled={loadingHistory === s.id}
                    onClick={() => toggleTranscripts(s.id)}
                  >
                    {loadingHistory === s.id
                      ? "Loading..."
                      : isOpen
                        ? "Hide transcripts"
                        : "View transcripts"}
                  </button>
                </div>

                {isOpen && history && (
                  <div className="history-transcripts">
                    {!hasAnswers ? (
                      <p style={{ color: "#64748b" }}>
                        No submitted answers yet for this session.
                      </p>
                    ) : (
                      history.questions.map(({ question, answers }) =>
                        answers.map((answer) => (
                          <div key={answer.id} style={{ marginBottom: "1rem" }}>
                            <h4>{question.text}</h4>
                            <TranscriptPanel
                              transcript={answer.transcript}
                              source={answer.transcript_source}
                            />
                          </div>
                        ))
                      )
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
