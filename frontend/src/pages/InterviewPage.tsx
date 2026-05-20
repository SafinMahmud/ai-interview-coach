import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api/client";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useWebSpeech } from "@/hooks/useWebSpeech";
import type { Question, Score, TranscriptSource } from "@/types";

export default function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [manualText, setManualText] = useState("");
  const [mode, setMode] = useState<"web_speech" | "whisper" | "text">("web_speech");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<Score | null>(null);

  const speech = useWebSpeech();
  const recorder = useAudioRecorder();

  useEffect(() => {
    if (!sessionId) return;
    api.listQuestions(sessionId).then(setQuestions).catch(console.error);
  }, [sessionId]);

  const current = questions[index];

  async function getTranscript(): Promise<{ text: string; source: TranscriptSource }> {
    if (mode === "text") {
      return { text: manualText.trim(), source: "text" };
    }
    if (mode === "web_speech") {
      return { text: speech.transcript.trim(), source: "web_speech" };
    }
    const blob = await recorder.stop();
    const { transcript } = await api.transcribe(blob);
    return { text: transcript, source: "local_whisper" };
  }

  async function submitAndEvaluate() {
    if (!sessionId || !current) return;
    setError(null);
    setLoading(true);
    setScore(null);
    try {
      const { text, source } = await getTranscript();
      if (!text) throw new Error("No transcript — record or type your answer first");
      const answer = await api.submitAnswer(sessionId, current.id, {
        transcript: text,
        transcript_source: source,
      });
      const result = await api.evaluate(answer.id);
      setScore(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (!current) {
    return <p>Loading questions...</p>;
  }

  return (
    <div>
      <p>
        Question {index + 1} of {questions.length}{" "}
        <span style={{ color: "#64748b" }}>({current.category})</span>
      </p>
      <div className="card">
        <h2>{current.text}</h2>
      </div>

      <div className="card">
        <h3>Answer mode</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={mode === "web_speech" ? "" : "secondary"}
            onClick={() => setMode("web_speech")}
          >
            Web Speech (demo)
          </button>
          <button
            type="button"
            className={mode === "whisper" ? "" : "secondary"}
            onClick={() => setMode("whisper")}
          >
            Record → Whisper
          </button>
          <button
            type="button"
            className={mode === "text" ? "" : "secondary"}
            onClick={() => setMode("text")}
          >
            Type answer
          </button>
        </div>

        {mode === "web_speech" && (
          <div style={{ marginTop: "1rem" }}>
            {!speech.supported && (
              <p className="error">Web Speech API not supported in this browser.</p>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={speech.start} disabled={speech.listening}>
                Start listening
              </button>
              <button type="button" className="secondary" onClick={speech.stop}>
                Stop
              </button>
            </div>
            <textarea
              rows={5}
              readOnly
              value={speech.transcript}
              placeholder="Transcript appears here..."
              style={{ marginTop: "0.75rem" }}
            />
          </div>
        )}

        {mode === "whisper" && (
          <div style={{ marginTop: "1rem" }}>
            <button type="button" onClick={recorder.start} disabled={recorder.recording}>
              {recorder.recording ? "Recording..." : "Start recording"}
            </button>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Stop recording when you submit — audio is sent to the backend for transcription.
            </p>
          </div>
        )}

        {mode === "text" && (
          <textarea
            rows={5}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Type your answer..."
            style={{ marginTop: "1rem" }}
          />
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button type="button" onClick={submitAndEvaluate} disabled={loading}>
          {loading ? "Evaluating..." : "Submit & evaluate"}
        </button>
        {index < questions.length - 1 && (
          <button
            type="button"
            className="secondary"
            disabled={!score}
            onClick={() => {
              setIndex((i) => i + 1);
              setScore(null);
              speech.reset();
              setManualText("");
            }}
          >
            Next question
          </button>
        )}
      </div>

      {score && <ScoreDisplay score={score} />}
    </div>
  );
}
