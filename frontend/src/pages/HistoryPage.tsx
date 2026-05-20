import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import type { SessionSummary } from "@/types";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading history...</p>;

  return (
    <div>
      <h1>Session history</h1>
      <p>Compare past practice runs and average scores.</p>
      {sessions.length === 0 ? (
        <p>No sessions yet. <Link to="/">Start your first interview</Link>.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sessions.map((s) => (
            <li key={s.id} className="card">
              <strong>{s.company_name ?? "General practice"}</strong>
              <p style={{ color: "#64748b", margin: "0.25rem 0" }}>{s.jd_preview}</p>
              <p>
                {s.question_count} questions ·{" "}
                {s.avg_score != null ? `Avg score ${s.avg_score}/10` : "Not evaluated yet"}
              </p>
              <Link to={`/interview/${s.id}`}>Continue</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
