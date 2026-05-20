import type { Score } from "@/types";

interface Props {
  score: Score;
}

export function ScoreDisplay({ score }: Props) {
  const dimensions = [
    { label: "Relevance", value: score.relevance },
    { label: "Clarity", value: score.clarity },
    { label: "STAR", value: score.star_method },
    { label: "Confidence", value: score.confidence },
    { label: "Filler words", value: score.filler_word_count, isCount: true },
  ];

  return (
    <div className="card">
      <h3>Evaluation</h3>
      <div className="score-grid">
        {dimensions.map((d) => (
          <div key={d.label} className="score-pill">
            <strong>{d.isCount ? d.value : d.value.toFixed(1)}</strong>
            {d.label}
          </div>
        ))}
      </div>
      <p style={{ marginTop: "1rem" }}>{score.feedback.summary}</p>
      {score.feedback.strengths.length > 0 && (
        <>
          <h4>Strengths</h4>
          <ul>
            {score.feedback.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      )}
      {score.feedback.improvements.length > 0 && (
        <>
          <h4>Improvements</h4>
          <ul>
            {score.feedback.improvements.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
