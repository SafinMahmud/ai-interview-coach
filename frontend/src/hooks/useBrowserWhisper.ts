import { useCallback, useState } from "react";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

type Status = "idle" | "loading_model" | "transcribing" | "ready" | "error";

type AsrTranscriber = (
  input: Float32Array,
  options?: {
    return_timestamps?: boolean;
    language?: string;
    task?: string;
    chunk_length_s?: number;
    stride_length_s?: number;
  }
) => Promise<{ text?: string }>;

/** Better accuracy than whisper-tiny; still runs in-browser. */
const MODEL_ID = "Xenova/whisper-base.en";

let transcriberPromise: Promise<AsrTranscriber> | null = null;

function loadTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      "automatic-speech-recognition",
      MODEL_ID
    ) as Promise<AsrTranscriber>;
  }
  return transcriberPromise;
}

/** Resample browser recording to 16 kHz mono — what Whisper expects. */
async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  await ctx.close();

  const sampleCount = Math.max(1, Math.ceil(decoded.duration * 16000));
  const offline = new OfflineAudioContext(1, sampleCount, 16000);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[(?:INAUDIBLE|inaudible|unclear|unintelligible)\]/gi, " ")
    .replace(/\((?:inaudible|unintelligible)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMeaningfulTranscript(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  return letters.length >= 8;
}

/** Whisper runs fully in the browser — safe for Vercel + Render free tier. */
export function useBrowserWhisper() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preloadModel = useCallback(async () => {
    setError(null);
    setStatus("loading_model");
    setMessage(
      "Downloading speech model (~75MB, cached in browser after first load)..."
    );
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
      const audio = await blobToMono16k(blob);
      const result = await transcriber(audio, {
        return_timestamps: false,
        language: "english",
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      const text = cleanTranscript(String(result?.text ?? ""));
      if (!isMeaningfulTranscript(text)) {
        throw new Error(
          "Speech was unclear (got [INAUDIBLE] or silence). Speak louder, closer to the mic, in a quiet room, for at least 5–10 seconds — or use Type answer."
        );
      }
      setStatus("ready");
      setMessage("");
      return text;
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
