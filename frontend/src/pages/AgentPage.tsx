import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgent, deleteAgent, chatWithAgent, getCalendarStatus, getCalendarAuthUrl } from '../services/api';
import type { AgentConfig } from '../services/api';
import Sidebar from '../components/Sidebar';

const T = {
  forest:       '#1d8c63',
  forestDeep:   '#177350',
  forestSoft:   '#ecfdf5',
  ink:          '#111827',
  body:         '#374151',
  secondary:    '#6b7280',
  muted:        '#9ca3af',
  border:       '#e5e7eb',
  borderStrong: '#d1d5db',
  surfaceAlt:   '#f9fafb',
  bg:           '#ffffff',
  surface:      '#ffffff',
  green:        '#1d8c63',
  greenSoft:    '#ecfdf5',
};

const font = "'Bricolage Grotesque', sans-serif";

const MicIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const ChevLeft: React.FC = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const SendIcon: React.FC = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 99,
    background: active ? T.greenSoft : T.surfaceAlt,
    border: `1px solid ${active ? '#a8dfc8' : T.border}`,
  }}>
    <div style={{
      width: 7, height: 7, borderRadius: 99,
      background: active ? T.green : T.muted,
      boxShadow: active ? '0 0 0 2px rgba(42,157,114,0.22)' : 'none',
    }} />
    <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#1a6647' : T.muted, fontFamily: font }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  </div>
);

const InfoBlock: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: font }}>{label}</div>
      <div style={{ fontSize: 14, color: T.body, lineHeight: 1.7, fontWeight: 500, fontFamily: font }}>{value}</div>
    </div>
  ) : null;

const TypingIndicator: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', background: T.surfaceAlt, borderRadius: '18px 18px 18px 4px', width: 'fit-content' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: 6, height: 6, borderRadius: 99, background: T.muted, animation: `typingDot 1.2s ${i * 0.2}s cubic-bezier(0.22,1,0.36,1) infinite` }} />
    ))}
    <style>{`@keyframes typingDot { 0%,80%,100%{transform:translateY(0);opacity:0.5} 40%{transform:translateY(-5px);opacity:1} }`}</style>
  </div>
);

const QUICK_PROMPTS = [
  "I'd like to book an appointment",
  "What are your available hours?",
  "Do you have any openings this week?",
  "Can I reschedule my appointment?",
];

type Message = { role: 'user' | 'assistant'; content: string };

const ConvoTester: React.FC<{ agent: AgentConfig; calendarConnected: boolean | null }> = ({ agent, calendarConnected }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      const el = bottomRef.current.parentElement!;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setStarted(true);

    try {
      const data = await chatWithAgent(agent.id, text.trim(), messages);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having a little trouble right now. Could you try again in a moment?" }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 99, background: T.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MicIcon color="#fff" size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, fontFamily: font }}>{agent.name}</div>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 500, fontFamily: font }}>Simulates how your agent responds to real customers</div>
        </div>
        {started && (
          <button
            onClick={() => { setMessages([]); setStarted(false); }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.color = T.body; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.muted; }}
            style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'all 0.12s', fontFamily: font }}
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 16px' }}>
        {!calendarConnected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, paddingBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6, fontFamily: font }}>Google Calendar required</div>
              <div style={{ fontSize: 13, color: T.secondary, maxWidth: 260, lineHeight: 1.6, fontFamily: font }}>
                Connect your Google Calendar using the panel on the left to start testing your agent.
              </div>
            </div>
          </div>
        )}

        {calendarConnected && !started && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24, paddingBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: T.forestSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <MicIcon size={22} color={T.forest} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6, fontFamily: font }}>Start a test call</div>
              <div style={{ fontSize: 13, color: T.secondary, maxWidth: 280, lineHeight: 1.6, fontFamily: font }}>
                Type as if you're a customer calling in. See how your agent responds.
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 380 }}>
              {QUICK_PROMPTS.map(q => (
                <button key={q} onClick={() => send(q)}
                  onMouseEnter={e => { e.currentTarget.style.background = T.forestSoft; e.currentTarget.style.borderColor = T.forest; e.currentTarget.style.color = T.forest; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.bg; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.secondary; }}
                  style={{ padding: '8px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 99, fontSize: 13, fontWeight: 600, color: T.secondary, cursor: 'pointer', transition: 'all 0.12s', fontFamily: font }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {started && messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 99, background: T.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                <MicIcon color="#fff" size={12} />
              </div>
            )}
            <div style={{
              maxWidth: '72%', padding: '11px 16px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? T.forest : T.surfaceAlt,
              color: m.role === 'user' ? '#fff' : T.body,
              fontSize: 14, lineHeight: 1.6, fontWeight: 500, fontFamily: font,
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, background: T.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MicIcon color="#fff" size={12} />
            </div>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, opacity: calendarConnected ? 1 : 0.45, pointerEvents: calendarConnected ? 'auto' : 'none' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={calendarConnected ? 'Type as a caller…' : 'Connect Google Calendar to start…'}
          style={{ flex: 1, padding: '11px 16px', border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: font, color: T.ink, background: T.bg, transition: 'border-color 0.15s' }}
          onFocus={e => (e.target.style.borderColor = T.forest)}
          onBlur={e => (e.target.style.borderColor = T.border)}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading || !calendarConnected}
          onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.background = T.forestDeep; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.forest; }}
          style={{ padding: '11px 18px', background: T.forest, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: (!input.trim() || loading || !calendarConnected) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1, transition: 'all 0.15s', fontFamily: font, display: 'flex', alignItems: 'center', gap: 6 }}>
          <SendIcon /> Send
        </button>
      </div>
    </div>
  );
};

/* ── Agent Page ─────────────────────────────────── */
const AgentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAgent(Number(id))
      .then(setAgent)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getCalendarStatus()
      .then(d => setCalendarConnected(d.connected))
      .catch(() => setCalendarConnected(false));
  }, []);

  const handleConnectCalendar = async () => {
    if (!id) return;
    setCalendarLoading(true);
    try {
      const data = await getCalendarAuthUrl(`/agent/${id}`);
      window.location.href = data.url;
    } catch {
      setCalendarLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    await deleteAgent(agent.id);
    navigate('/dashboard');
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: font }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <p style={{ color: T.muted, fontSize: 15, fontFamily: font }}>Loading…</p>
      </main>
    </div>
  );

  if (error || !agent) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: font }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: T.bg }}>
        <p style={{ color: T.secondary, fontSize: 15, fontFamily: font }}>Agent not found.</p>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, fontWeight: 700, color: T.forest, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font }}>← Back to Dashboard</button>
      </main>
    </div>
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');`}</style>
      <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: font }}>
        <Sidebar />

        <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: '-0.6px', marginBottom: 6, marginTop: 0, fontFamily: font }}>{agent.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge active={agent.is_active ?? true} />
                {agent.created_at && (
                  <span style={{ fontSize: 12, color: T.muted, fontWeight: 500, fontFamily: font }}>
                    Created {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.borderColor = T.borderStrong; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.body, cursor: 'pointer', fontFamily: font, transition: 'all 0.15s' }}
            >
              <ChevLeft /> Dashboard
            </button>
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, flex: 1, minHeight: 0 }}>

            {/* Left: Agent info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Profile card */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 8px rgba(25,21,16,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: T.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MicIcon color="#fff" size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: '-0.3px', fontFamily: font }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: font }}>Voice Agent</div>
                  </div>
                </div>
                <InfoBlock label="Services Offered" value={agent.services} />
                <InfoBlock label="Business Hours" value={agent.business_hours} />
                {!agent.services && !agent.business_hours && (
                  <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '12px 0', fontFamily: font }}>
                    No details configured yet.
                  </div>
                )}
              </div>

              {/* Calendar auth card */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '20px 24px', boxShadow: '0 2px 8px rgba(25,21,16,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={T.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.secondary, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font }}>Google Calendar</div>
                </div>

                {calendarConnected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: T.green, boxShadow: '0 0 0 2px rgba(42,157,114,0.22)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a6647', fontFamily: font }}>Connected</span>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: T.secondary, marginBottom: 14, lineHeight: 1.6, marginTop: 0, fontFamily: font }}>
                      Connect your Google Calendar so your agent can check availability and book appointments.
                    </p>
                    <button
                      onClick={handleConnectCalendar}
                      disabled={calendarLoading}
                      onMouseEnter={e => { if (!calendarLoading) e.currentTarget.style.background = T.forestDeep; }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.forest; }}
                      style={{ width: '100%', padding: '9px', background: T.forest, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: calendarLoading ? 'not-allowed' : 'pointer', opacity: calendarLoading ? 0.6 : 1, fontFamily: font, transition: 'all 0.12s' }}
                    >
                      {calendarLoading ? 'Redirecting…' : 'Connect Google Calendar'}
                    </button>
                  </>
                )}
              </div>

              {/* Danger zone */}
              <div style={{ background: T.surface, border: '1px solid #f5c6c6', borderRadius: 20, padding: '20px 24px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: font }}>Danger Zone</div>
                <p style={{ fontSize: 13, color: T.secondary, marginBottom: 14, lineHeight: 1.6, marginTop: 0, fontFamily: font }}>Permanently delete this agent and all its data.</p>
                <button
                  onClick={handleDelete}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  style={{ width: '100%', padding: '9px', background: 'transparent', border: '1.5px solid #f5c6c6', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#b91c1c', cursor: 'pointer', fontFamily: font, transition: 'all 0.12s' }}
                >
                  Delete agent
                </button>
              </div>
            </div>

            {/* Right: Conversation Tester */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
              <ConvoTester agent={agent} calendarConnected={calendarConnected} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default AgentPage;
