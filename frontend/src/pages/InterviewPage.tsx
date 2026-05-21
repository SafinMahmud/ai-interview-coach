import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api/client";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBrowserWhisper } from "@/hooks/useBrowserWhisper";
import { useWebSpeech } from "@/hooks/useWebSpeech";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import type { Question, Score, SessionHistory, TranscriptSource } from "@/types";

type AnswerMode = "browser_whisper" | "web_speech" | "text";

export default function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [manualText, setManualText] = useState("");
  const [mode, setMode] = useState<AnswerMode>("browser_whisper");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [submittedTranscript, setSubmittedTranscript] = useState<{
    text: string;
    source: TranscriptSource;
  } | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory | null>(
    null
  );

  const speech = useWebSpeech();
  const recorder = useAudioRecorder();
  const browserWhisper = useBrowserWhisper();

  useEffect(() => {
    if (!sessionId) return;
    api.listQuestions(sessionId).then(setQuestions).catch(console.error);
    api.sessionHistory(sessionId).then(setSessionHistory).catch(() => {});
  }, [sessionId]);

  const current = questions[index];

  const savedAnswer = sessionHistory?.questions
    .find((q) => q.question.id === current?.id)
    ?.answers.at(-1);

  async function getTranscript(): Promise<{ text: string; source: TranscriptSource }> {
    if (mode === "text") {
      return { text: manualText.trim(), source: "text" };
    }
    if (mode === "web_speech") {
      return { text: speech.transcript.trim(), source: "web_speech" };
    }
    const blob = await recorder.stop();
    const text = await browserWhisper.transcribe(blob);
    setLastTranscript(text);
    return { text, source: "browser_whisper" };
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
      setSubmittedTranscript({ text, source });
      setShowTranscript(true);
      setSessionHistory((prev) => {
        if (!prev || !current) return prev;
        const updated = structuredClone(prev);
        const entry = updated.questions.find((q) => q.question.id === current.id);
        if (entry) {
          entry.answers.push({
            id: answer.id,
            transcript: text,
            transcript_source: source,
            created_at: answer.created_at,
            score: result,
          });
        }
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  function resetQuestionState() {
    setScore(null);
    setSubmittedTranscript(null);
    setShowTranscript(false);
    setLastTranscript("");
    speech.reset();
    browserWhisper.reset();
    setManualText("");
  }

  if (!current) {
    return <p>Loading questions...</p>;
  }

  const busy = loading || browserWhisper.isBusy;

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
            className={mode === "browser_whisper" ? "" : "secondary"}
            onClick={() => setMode("browser_whisper")}
          >
            Record (browser Whisper)
          </button>
          <button
            type="button"
            className={mode === "web_speech" ? "" : "secondary"}
            onClick={() => setMode("web_speech")}
          >
            Live captions (Chrome)
          </button>
          <button
            type="button"
            className={mode === "text" ? "" : "secondary"}
            onClick={() => setMode("text")}
          >
            Type answer
          </button>
        </div>

        {mode === "browser_whisper" && (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 0 }}>
              Speech runs in your browser — no server RAM needed. First use downloads
              a small model (~40MB) and caches it.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => browserWhisper.preloadModel().catch(() => {})}
                disabled={browserWhisper.isBusy}
              >
                Preload model
              </button>
              <button
                type="button"
                onClick={recorder.start}
                disabled={recorder.recording || busy}
              >
                {recorder.recording ? "Recording..." : "Start recording"}
              </button>
            </div>
            {browserWhisper.message && (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                {browserWhisper.message}
              </p>
            )}
            {browserWhisper.error && (
              <p className="error">{browserWhisper.error}</p>
            )}
            {lastTranscript && (
              <textarea
                rows={4}
                readOnly
                value={lastTranscript}
                style={{ marginTop: "0.75rem" }}
              />
            )}
          </div>
        )}

        {mode === "web_speech" && (
          <div style={{ marginTop: "1rem" }}>
            {!speech.supported && (
              <p className="error">
                Web Speech is not supported here. Use Record (browser Whisper) or
                type your answer. Chrome desktop works best.
              </p>
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
              placeholder="Live transcript appears here..."
              style={{ marginTop: "0.75rem" }}
            />
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

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button type="button" onClick={submitAndEvaluate} disabled={busy}>
          {loading
            ? mode === "browser_whisper"
              ? "Transcribing & evaluating..."
              : "Evaluating..."
            : "Submit & evaluate"}
        </button>
        {(submittedTranscript || savedAnswer) && (
          <button
            type="button"
            className="secondary"
            onClick={() => setShowTranscript((v) => !v)}
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
        )}
        {index < questions.length - 1 && (
          <button
            type="button"
            className="secondary"
            disabled={!score}
            onClick={() => {
              setIndex((i) => i + 1);
              resetQuestionState();
            }}
          >
            Next question
          </button>
        )}
      </div>

      {showTranscript && (submittedTranscript || savedAnswer) && (
        <TranscriptPanel
          transcript={submittedTranscript?.text ?? savedAnswer!.transcript}
          source={submittedTranscript?.source ?? savedAnswer!.transcript_source}
        />
      )}

      {score && <ScoreDisplay score={score} />}
    </div>
  );
}
