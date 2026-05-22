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
    if (!recorder.hasStarted) {
      throw new Error(
        "Click Start recording first and allow the microphone. Then speak and click Submit & evaluate (Stop recording is optional)."
      );
    }
    let blob: Blob;
    try {
      blob = await recorder.stop();
    } catch {
      throw new Error(
        "Could not read your recording. Click Start recording, allow the microphone, speak, then Submit."
      );
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
    recorder.reset();
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
            <ol className="recording-steps">
              <li>
                Click <strong>Start recording</strong> and allow microphone access.
              </li>
              <li>
                Speak clearly, close to the mic, in a quiet room, for at least{" "}
                <strong>5–10 seconds</strong>.
              </li>
              <li>
                Click <strong>Submit &amp; evaluate</strong> when finished — you do{" "}
                <em>not</em> need to press Stop first.
              </li>
            </ol>
            <p className="recording-status" data-active={recorder.recording}>
              {recorder.recording
                ? "● Recording — speak now, then Submit & evaluate"
                : recorder.isStopped
                  ? "✓ Recording saved — click Submit & evaluate"
                  : recorder.hasStarted
                    ? "Ready — click Submit & evaluate"
                    : "Click Start recording to begin"}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() =>
                  recorder.start().catch(() =>
                    setError("Microphone access was denied or unavailable.")
                  )
                }
                disabled={recorder.recording || busy}
              >
                Start recording
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  recorder
                    .stop()
                    .catch(() =>
                      setError("Stop failed — try Start recording again.")
                    )
                }
                disabled={!recorder.recording || busy}
                title="Optional — Submit also stops the recording for you"
              >
                Stop recording (optional)
              </button>
            </div>
            <p className="recording-optional">
              Optional:{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => browserWhisper.preloadModel().catch(() => {})}
                disabled={browserWhisper.isBusy}
              >
                Download speech model early
              </button>{" "}
              (~75MB once per browser). You do <em>not</em> need this before recording —
              Submit downloads it automatically the first time.
            </p>
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
                placeholder="Your transcript will appear here after submit..."
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
