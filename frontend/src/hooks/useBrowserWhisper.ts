import { useCallback, useState } from "react";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

type Status = "idle" | "loading_model" | "transcribing" | "ready" | "error";

type AsrTranscriber = (
  input: string,
  options?: { return_timestamps?: boolean; language?: string; task?: string }
) => Promise<{ text?: string }>;

let transcriberPromise: Promise<AsrTranscriber> | null = null;

function loadTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en"
    ) as Promise<AsrTranscriber>;
  }
  return transcriberPromise;
}

/** Whisper runs fully in the browser — safe for Vercel + Render free tier. */
export function useBrowserWhisper() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preloadModel = useCallback(async () => {
    setError(null);
    setStatus("loading_model");
    setMessage("Downloading speech model (~40MB, cached in browser after first load)...");
    try {
      await loadTranscriber();
      setStatus("ready");
      setMessage("Model ready — you can Start recording whenever you like.");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load model");
      throw err;
    }
  }, []);

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    setError(null);
    setStatus("loading_model");
    setMessage("Loading speech model...");
    try {
      const transcriber = await loadTranscriber();
      setStatus("transcribing");
      setMessage("Transcribing in your browser...");
      const url = URL.createObjectURL(blob);
      try {
        const result = await transcriber(url, {
          return_timestamps: false,
          language: "english",
          task: "transcribe",
        });
        const text = String(result?.text ?? "").trim();
        if (!text) {
          throw new Error(
            "We couldn't detect speech. Use Start recording, speak clearly for 5–10 seconds, then Submit & evaluate. Check your microphone and try again."
          );
        }
        setStatus("ready");
        setMessage("");
        return text;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Transcription failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setError(null);
  }, []);

  return {
    status,
    message,
    error,
    preloadModel,
    transcribe,
    reset,
    isBusy: status === "loading_model" || status === "transcribing",
  };
}
