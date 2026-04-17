import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function speakText(text: string, options?: { rate?: number; pitch?: number; lang?: string }) {
  if (typeof window === 'undefined' || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.trim());
  u.rate = options?.rate ?? 1;
  u.pitch = options?.pitch ?? 1;
  u.lang = options?.lang ?? 'en-US';
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
}

/** Resolves when TTS finishes (or errors). */
export function speakTextAsync(
  text: string,
  options?: { rate?: number; pitch?: number; lang?: string },
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !text.trim()) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.trim());
    u.rate = options?.rate ?? 1;
    u.pitch = options?.pitch ?? 1;
    u.lang = options?.lang ?? 'en-US';
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

const DEFAULT_SILENCE_MS = 1400;

/**
 * Listens until you pause (~{silenceMs}ms without new speech), then resolves with what you said.
 * Uses Web Speech API with continuous recognition + silence debounce (Chrome-friendly).
 * Resolves null if nothing was said, no-speech, or aborted.
 */
export function listenAfterPause(opts?: {
  lang?: string;
  silenceMs?: number;
  signal?: AbortSignal;
  /** Fired on each recognition result while listening (interim + final stitched). */
  onPartial?: (text: string) => void;
}): Promise<string | null> {
  const lang = opts?.lang ?? 'en-US';
  const silenceMs = opts?.silenceMs ?? DEFAULT_SILENCE_MS;
  const signal = opts?.signal;
  const onPartial = opts?.onPartial;

  return new Promise((resolve) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      resolve(null);
      return;
    }

    let rec: SpeechRecognition | null = null;
    let lastSoundAt = Date.now();
    let silenceWatch: ReturnType<typeof setInterval> | null = null;
    let maxWatch: ReturnType<typeof setTimeout> | null = null;
    let latestText = '';
    let heardAnything = false;
    let settled = false;

    const cleanup = () => {
      if (silenceWatch) {
        clearInterval(silenceWatch);
        silenceWatch = null;
      }
      if (maxWatch) {
        clearTimeout(maxWatch);
        maxWatch = null;
      }
      signal?.removeEventListener('abort', onAbort);
    };

    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        rec?.stop();
      } catch {
        /* ignore */
      }
      rec = null;
      resolve(value?.trim() ? value.trim() : null);
    };

    const onAbort = () => {
      try {
        rec?.abort();
      } catch {
        /* ignore */
      }
      done(null);
    };

    signal?.addEventListener('abort', onAbort);

    try {
      rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        heardAnything = true;
        lastSoundAt = Date.now();
        let line = '';
        for (let i = 0; i < event.results.length; i++) {
          line += event.results[i][0].transcript;
        }
        latestText = line.trim();
        onPartial?.(latestText);
      };

      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        if (ev.error === 'aborted') {
          done(null);
          return;
        }
        if (ev.error === 'no-speech') {
          done(null);
          return;
        }
        done(latestText.trim() || null);
      };

      rec.onend = () => {
        done(latestText.trim() || null);
      };

      silenceWatch = setInterval(() => {
        if (!rec) return;
        if (!heardAnything) return;
        if (Date.now() - lastSoundAt < silenceMs) return;
        if (!latestText.trim()) return;
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }, 200);

      maxWatch = setTimeout(() => {
        if (settled) return;
        try {
          rec?.abort();
        } catch {
          /* ignore */
        }
        done(null);
      }, 25000);

      rec.start();
    } catch {
      cleanup();
      resolve(null);
    }
  });
}

export type UseVoiceTranscriptionResult = {
  transcript: string;
  interim: string;
  isListening: boolean;
  error: string | null;
  supported: boolean;
  start: () => void;
  stop: () => void;
  clear: () => void;
  setTranscript: (value: string) => void;
};

/**
 * Browser speech-to-text (Chrome / Edge Web Speech API).
 * Requires HTTPS or localhost; user must allow microphone.
 */
export function useVoiceTranscription(lang = 'en-US'): UseVoiceTranscriptionResult {
  const [interim, setInterim] = useState('');
  const [transcript, _setTranscript] = useState('');
  const setTranscript = useCallback((value: string) => {
    _setTranscript(value);
    setInterim('');
  }, []);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const supported = isSpeechRecognitionSupported();

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    setError(null);
    setInterim('');

    try {
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalAppend = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalAppend += piece;
          } else {
            interimText += piece;
          }
        }
        if (finalAppend) {
          _setTranscript((prev) => (prev ? `${prev} ${finalAppend}`.trim() : finalAppend.trim()));
        }
        setInterim(interimText);
      };

      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        if (ev.error === 'aborted' || ev.error === 'no-speech') return;
        setError(ev.message || ev.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        setInterim('');
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start microphone.');
      setIsListening(false);
    }
  }, [lang]);

  const clear = useCallback(() => {
    setTranscript('');
    setError(null);
  }, [setTranscript]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  return {
    transcript,
    interim,
    isListening,
    error,
    supported,
    start,
    stop,
    clear,
    setTranscript,
  };
}
