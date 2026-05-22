import { useCallback, useRef, useState } from "react";

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognition)
  | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/** Live captions via browser — needs Chrome/Edge + internet (Google STT). */
export function useWebSpeech() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => !!getSpeechRecognitionCtor());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wantListeningRef = useRef(false);
  const networkRetriesRef = useRef(0);

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setError("Live captions are not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setError(null);
    wantListeningRef.current = true;
    networkRetriesRef.current = 0;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };

    recognition.onerror = (event: Event) => {
      const code = (event as SpeechRecognitionErrorEvent).error;

      if (code === "network" && networkRetriesRef.current < 2) {
        networkRetriesRef.current += 1;
        setError(`Reconnecting to speech service (attempt ${networkRetriesRef.current + 1}/3)…`);
        window.setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            recognition.start();
            setError(null);
          } catch {
            setError(
              "Speech service unreachable. Use Record answer (recommended) or Type answer. Disable VPN/ad blockers if using Live captions."
            );
            wantListeningRef.current = false;
            setListening(false);
          }
        }, 800);
        return;
      }

      const messages: Record<string, string> = {
        "not-allowed":
          "Microphone blocked. Allow mic access for this site in browser settings.",
        network:
          "Speech service unreachable (Google). Use Record answer or Type answer. Try disabling VPN/ad blockers.",
        "no-speech": "No speech heard. Speak after clicking Start listening.",
        aborted: "Listening stopped.",
        "audio-capture": "No microphone found. Plug in a mic or use Type answer.",
      };
      setError(messages[code] ?? `Speech error: ${code}`);
      if (code !== "no-speech" && code !== "aborted") {
        wantListeningRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      // Chrome stops after silence — restart while user still wants to listen
      if (wantListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      wantListeningRef.current = false;
      setError("Could not start listening. Try again or use Type answer.");
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    wantListeningRef.current = false;
    networkRetriesRef.current = 0;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setTranscript("");
    setListening(false);
    setError(null);
  }, []);

  return {
    transcript,
    listening,
    supported,
    error,
    start,
    stop,
    reset,
    setTranscript,
  };
};
