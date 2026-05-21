interface Props {
  transcript: string;
  source?: string;
  label?: string;
}

export function TranscriptPanel({ transcript, source, label = "Your answer" }: Props) {
  return (
    <div className="transcript-panel">
      <div className="transcript-panel-header">
        <strong>{label}</strong>
        {source && (
          <span className="transcript-source">
            via {source.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <p className="transcript-text">{transcript}</p>
    </div>
  );
}
