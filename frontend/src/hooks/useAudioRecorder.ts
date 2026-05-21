import { useCallback, useRef, useState } from "react";

const MIN_BLOB_BYTES = 2000;

/** MediaRecorder for in-browser Whisper transcription. */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [lastDurationSec, setLastDurationSec] = useState<number | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRef.current = recorder;
    startedAtRef.current = Date.now();
    setHasStarted(true);
    setRecording(true);
    setLastDurationSec(null);
  }, []);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRef.current;
      if (!recorder || !hasStarted) {
        reject(new Error("NOT_STARTED"));
        return;
      }
      if (recorder.state === "inactive") {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        resolve(blob);
        return;
      }
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        const duration = (Date.now() - startedAtRef.current) / 1000;
        setLastDurationSec(Math.round(duration));
        setRecording(false);
        mediaRef.current = null;
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      recorder.stop();
    });
  }, [hasStarted]);

  const reset = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setHasStarted(false);
    setLastDurationSec(null);
  }, []);

  const validateBlob = useCallback((blob: Blob, durationSec: number | null) => {
    if (blob.size < MIN_BLOB_BYTES) {
      return "Recording was empty or too short. Click Start recording, speak for at least 5 seconds, then Submit.";
    }
    if (durationSec !== null && durationSec < 2) {
      return "Recording was too short. Speak for at least 5 seconds before submitting.";
    }
    return null;
  }, []);

  return {
    recording,
    hasStarted,
    lastDurationSec,
    start,
    stop,
    reset,
    validateBlob,
  };
};
