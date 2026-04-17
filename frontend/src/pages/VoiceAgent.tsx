import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listenAfterPause,
  speakTextAsync,
  stopSpeaking,
  isSpeechRecognitionSupported,
} from '../lib/voiceMemo';

const HARDCODED_REPLY = 'I am doing great, what about you?';

type Phase = 'idle' | 'listening' | 'speaking';

const VoiceAgent: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [liveUser, setLiveUser] = useState('');
  const [agentReply, setAgentReply] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const supported = isSpeechRecognitionSupported();

  const handleMicClick = async () => {
    if (phase === 'listening') {
      abortRef.current?.abort();
      setPhase('idle');
      setLiveUser('');
      setHint('Cancelled.');
      return;
    }
    if (phase === 'speaking') {
      stopSpeaking();
      setPhase('idle');
      setHint('Stopped playback.');
      return;
    }

    setHint(null);
    setLiveUser('');
    setAgentReply('');
    abortRef.current = new AbortController();
    setPhase('listening');

    const said = await listenAfterPause({
      lang: 'en-US',
      silenceMs: 1400,
      signal: abortRef.current.signal,
      onPartial: (text) => setLiveUser(text),
    });

    if (abortRef.current.signal.aborted) {
      setPhase('idle');
      return;
    }

    setPhase('idle');

    if (!said) {
      setLiveUser('');
      setHint('Did not catch speech — try again and speak after the mic turns on.');
      return;
    }

    setLiveUser(said);
    setAgentReply(HARDCODED_REPLY);
    setPhase('speaking');
    await speakTextAsync(HARDCODED_REPLY);
    setPhase('idle');
    setHint(null);
  };

  const userLine =
    phase === 'listening' && !liveUser.trim() ? 'Listening…' : liveUser.trim() || '—';

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold tracking-tight">Voice</h1>
        <Link to="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          ← Dashboard
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8 w-full max-w-lg mx-auto">
        {!supported && (
          <p className="text-center text-amber-800 text-sm max-w-md">
            Speech recognition is not available in this browser. Use Chrome or Edge on desktop.
          </p>
        )}

        <button
          type="button"
          disabled={!supported}
          onClick={handleMicClick}
          aria-label={
            phase === 'listening'
              ? 'Stop listening'
              : phase === 'speaking'
                ? 'Stop speaking'
                : 'Start microphone'
          }
          className={[
            'relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full',
            'bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700',
            'shadow-[0_12px_40px_-8px_rgba(37,99,235,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]',
            'ring-1 ring-white/25 transition-all duration-300 ease-out',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50',
            supported && phase === 'idle' && 'hover:scale-[1.04] hover:shadow-[0_16px_48px_-6px_rgba(37,99,235,0.6)] active:scale-[0.98]',
            supported && phase === 'listening' &&
              'scale-[1.03] animate-pulse ring-4 ring-sky-300/90 ring-offset-2 ring-offset-slate-50 from-blue-600 via-indigo-700 to-indigo-900',
            supported && phase === 'speaking' &&
              'from-indigo-500 via-violet-600 to-indigo-900 shadow-[0_12px_40px_-8px_rgba(79,70,229,0.55)]',
            !supported && 'cursor-not-allowed opacity-45 grayscale',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span
            className={[
              'pointer-events-none absolute inset-[10%] rounded-full bg-white/10',
              'transition-opacity duration-300',
              phase === 'idle' && supported ? 'opacity-100' : 'opacity-70',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={[
              'relative z-10 h-[4.5rem] w-[4.5rem] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]',
              phase === 'listening' && 'scale-105',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden
          >
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 1 1-10 0H5a7 7 0 0 0 6 6.92V20H8v2h8v-2h-3v-2.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </button>

        <div
          className="w-full rounded-xl border-2 border-white bg-white/95 px-4 py-3 text-left shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm"
          aria-live="polite"
        >
          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            You
          </div>
          <p className="mt-1 min-h-[1.35rem] text-sm leading-relaxed text-slate-900">{userLine}</p>

          <div className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Agent
          </div>
          <p className="mt-1 min-h-[1.35rem] text-sm leading-relaxed text-slate-800">
            {agentReply.trim() ? agentReply : '—'}
          </p>
        </div>

        {hint && (
          <p className="text-center text-sm text-slate-500 max-w-md">{hint}</p>
        )}
      </main>
    </div>
  );
};

export default VoiceAgent;
