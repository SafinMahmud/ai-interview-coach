import { useCallback, useRef, useState } from "react";

const MIN_BLOB_BYTES = 2000;

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
}

const PREFERRED_MIME = typeof MediaRecorder !== "undefined" ? pickMimeType() : "audio/webm";

/** MediaRecorder for optional browser Whisper fallback. */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [lastDurationSec, setLastDurationSec] = useState<number | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const mimeRef = useRef(PREFERRED_MIME);

  const buildBlob = () => new Blob(chunksRef.current, { type: mimeRef.current });

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        // noiseSuppression/autoGainControl can zero-out speech on some Macs → blank Whisper
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const mime = pickMimeType();
    mimeRef.current = mime;
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(250);
    mediaRef.current = recorder;
    startedAtRef.current = Date.now();
    setHasStarted(true);
    setIsStopped(false);
    setRecording(true);
    setLastDurationSec(null);
  }, []);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!hasStarted) {
        reject(new Error("NOT_STARTED"));
        return;
      }

      if (isStopped && !mediaRef.current) {
        resolve(buildBlob());
        return;
      }

      const recorder = mediaRef.current;
      if (!recorder) {
        resolve(buildBlob());
        return;
      }

      if (recorder.state === "inactive") {
        setIsStopped(true);
        setRecording(false);
        resolve(buildBlob());
        return;
      }

      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        const duration = (Date.now() - startedAtRef.current) / 1000;
        setLastDurationSec(Math.round(duration));
        setRecording(false);
        setIsStopped(true);
        mediaRef.current = null;
        resolve(buildBlob());
      };

      if (recorder.state === "recording") {
        recorder.requestData();
      }
      recorder.stop();
    });
  }, [hasStarted, isStopped]);

  const reset = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setHasStarted(false);
    setIsStopped(false);
    setLastDurationSec(null);
  }, []);

  const validateBlob = useCallback((blob: Blob, durationSec: number | null) => {
    if (blob.size < MIN_BLOB_BYTES) {
      return "Recording was empty or too short. Record at least 5 seconds of speech.";
    }
    if (durationSec !== null && durationSec < 3) {
      return "Recording was too short. Speak for at least 5 seconds.";
    }
    return null;
  }, []);

  return {
    recording,
    hasStarted,
    isStopped,
    lastDurationSec,
    start,
    stop,
    reset,
    validateBlob,
  };
};
