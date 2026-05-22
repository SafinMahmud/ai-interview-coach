import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api/client";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBrowserWhisper } from "@/hooks/useBrowserWhisper";
import { useWebSpeech } from "@/hooks/useWebSpeech";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import type { Question, Score, SessionHistory, TranscriptSource } from "@/types";

type AnswerMode = "web_speech" | "browser_whisper" | "text";

function defaultVoiceMode(): AnswerMode {
  if (typeof window === "undefined") return "text";
  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    return "web_speech";
  }
  if (typeof MediaRecorder !== "undefined") {
    return "browser_whisper";
  }
  return "text";
}

export default function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [manualText, setManualText] = useState("");
  const initialMode = useMemo(() => defaultVoiceMode(), []);
  const [mode, setMode] = useState<AnswerMode>(initialMode);
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
      if (!speech.transcript.trim()) {
        throw new Error(
          "Click Start listening, allow the microphone, speak your answer (text appears below), then Submit. Requires Chrome/Edge and internet."
        );
      }
      if (speech.listening) {
        speech.stop();
      }
      return { text: speech.transcript.trim(), source: "web_speech" };
    }

    if (!recorder.hasStarted) {
      throw new Error(
        "Click Start recording, speak for at least 5 seconds, then Submit."
      );
    }
    let blob: Blob;
    try {
      blob = await recorder.stop();
    } catch {
      throw new Error("Could not read recording. Start recording and try again.");
    }
    const validationError = recorder.validateBlob(blob, recorder.lastDurationSec);
    if (validationError) {
      throw new Error(validationError);
    }
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
      if (!text) throw new Error("No transcript — speak or type your answer first");
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
    recorder.reset();
    setManualText("");
    setError(null);
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
        <h3>How do you want to answer?</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {speech.supported && (
            <button
              type="button"
              className={mode === "web_speech" ? "" : "secondary"}
              onClick={() => setMode("web_speech")}
            >
              Live voice (recommended)
            </button>
          )}
          <button
            type="button"
            className={mode === "browser_whisper" ? "" : "secondary"}
            onClick={() => setMode("browser_whisper")}
          >
            Record &amp; transcribe (fallback)
          </button>
          <button
            type="button"
            className={mode === "text" ? "" : "secondary"}
            onClick={() => setMode("text")}
          >
            Type answer
          </button>
        </div>

        {mode === "web_speech" && speech.supported && (
          <div style={{ marginTop: "1rem" }}>
            <ol className="recording-steps">
              <li>
                Click <strong>Start listening</strong> (allow microphone).
              </li>
              <li>
                Speak your answer — text appears live below (Chrome/Edge + internet).
              </li>
              <li>
                Click <strong>Submit &amp; evaluate</strong> when done.
              </li>
            </ol>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" onClick={speech.start} disabled={speech.listening}>
                {speech.listening ? "Listening…" : "Start listening"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={speech.stop}
                disabled={!speech.listening}
              >
                Stop listening
              </button>
            </div>
            {speech.error && <p className="error">{speech.error}</p>}
            <textarea
              rows={6}
              readOnly
              value={speech.transcript}
              placeholder="Your words will appear here as you speak…"
              style={{ marginTop: "0.75rem" }}
            />
          </div>
        )}

        {mode === "browser_whisper" && (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 0 }}>
              Fallback if Live voice fails. Downloads a model on first use (~40MB).
              Live voice is faster and usually more accurate in Chrome.
            </p>
            <ol className="recording-steps">
              <li>
                <strong>Start recording</strong> → allow microphone.
              </li>
              <li>Speak clearly for <strong>5+ seconds</strong>.</li>
              <li>
                <strong>Submit &amp; evaluate</strong> (stops recording automatically).
              </li>
            </ol>
            <p className="recording-status" data-active={recorder.recording}>
              {recorder.recording
                ? "● Recording — speak now"
                : recorder.isStopped
                  ? "✓ Saved — click Submit"
                  : recorder.hasStarted
                    ? "Ready — click Submit"
                    : "Click Start recording"}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() =>
                  recorder.start().catch(() =>
                    setError("Microphone access denied or unavailable.")
                  )
                }
                disabled={recorder.recording || busy}
              >
                Start recording
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
              <textarea rows={4} readOnly value={lastTranscript} style={{ marginTop: "0.75rem" }} />
            )}
          </div>
        )}

        {mode === "text" && (
          <textarea
            rows={6}
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
              ? "Transcribing & evaluating…"
              : "Evaluating…"
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
