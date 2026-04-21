import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgent, deleteAgent, chatWithAgent } from '../services/api';
import type { AgentConfig } from '../services/api';
import Sidebar from '../components/Sidebar';

const T = {
  b50: '#eff6ff', b100: '#dbeafe', b200: '#bfdbfe',
  b500: '#3b82f6', b600: '#2563eb', b700: '#1d4ed8', v600: '#7c3aed',
  s50: '#f8fafc', s100: '#f1f5f9', s200: '#e2e8f0',
  s300: '#cbd5e1', s400: '#94a3b8', s500: '#64748b',
  s600: '#475569', s700: '#334155', s900: '#0f172a',
  green: '#22c55e',
};

const Icon: React.FC<{ id: string; size?: number; color?: string }> = ({ id, size = 18, color = 'currentColor' }) => {
  const paths: Record<string, React.ReactNode> = {
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>,
    chevLeft: <path d="M15 18l-6-6 6-6" />,
    send: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
};

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 99,
    background: active ? '#f0fdf4' : T.s100,
    border: `1px solid ${active ? '#bbf7d0' : T.s200}`,
  }}>
    <div style={{
      width: 7, height: 7, borderRadius: 99,
      background: active ? T.green : T.s300,
      boxShadow: active ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
    }} />
    <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#15803d' : T.s400 }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  </div>
);

const InfoBlock: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.s400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 14, color: T.s700, lineHeight: 1.7, fontWeight: 500 }}>{value}</div>
    </div>
  ) : null;

const TypingIndicator: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', background: T.s100, borderRadius: '18px 18px 18px 4px', width: 'fit-content' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: 7, height: 7, borderRadius: 99, background: T.s400, animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
    ))}
    <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
  </div>
);

const QUICK_PROMPTS = [
  "I'd like to book an appointment",
  "What are your available hours?",
  "Do you have any openings this week?",
  "Can I reschedule my appointment?",
];

type Message = { role: 'user' | 'assistant'; content: string };

const ConvoTester: React.FC<{ agent: AgentConfig }> = ({ agent }) => {
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
      const data = await chatWithAgent(agent.id, text.trim());
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having a little trouble right now. Could you try again in a moment?" }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', border: `1px solid ${T.s200}`, borderRadius: 20, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.s100}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 99, background: `linear-gradient(135deg,${T.b500},${T.v600})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon id="mic" color="#fff" size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.s900 }}>{agent.name}</div>
          <div style={{ fontSize: 12, color: T.s400, fontWeight: 500 }}>Simulated call — responses powered by AI</div>
        </div>
        {started && (
          <button onClick={() => { setMessages([]); setStarted(false); }}
            onMouseEnter={e => { e.currentTarget.style.background = T.s100; e.currentTarget.style.color = T.s700; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.s400; }}
            style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: T.s400, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'all 0.1s', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 16px' }}>
        {!started && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24, paddingBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.s900, marginBottom: 6 }}>Start a test call</div>
              <div style={{ fontSize: 13, color: T.s400, maxWidth: 280, lineHeight: 1.6 }}>
                Type as if you're a customer calling in. See how your agent responds.
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 380 }}>
              {QUICK_PROMPTS.map(q => (
                <button key={q} onClick={() => send(q)}
                  onMouseEnter={e => { e.currentTarget.style.background = T.b50; e.currentTarget.style.borderColor = T.b200; e.currentTarget.style.color = T.b600; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.s50; e.currentTarget.style.borderColor = T.s200; e.currentTarget.style.color = T.s600; }}
                  style={{ padding: '8px 14px', background: T.s50, border: `1px solid ${T.s200}`, borderRadius: 99, fontSize: 13, fontWeight: 600, color: T.s600, cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {started && messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 99, background: `linear-gradient(135deg,${T.b500},${T.v600})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                <Icon id="mic" color="#fff" size={12} />
              </div>
            )}
            <div style={{ maxWidth: '72%', padding: '11px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? T.b600 : T.s100, color: m.role === 'user' ? '#fff' : T.s700, fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, background: `linear-gradient(135deg,${T.b500},${T.v600})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon id="mic" color="#fff" size={12} />
            </div>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input (S*/}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.s100}`, display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Type as a caller…"
          style={{ flex: 1, padding: '11px 16px', border: `1.5px solid ${T.s200}`, borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', color: T.s900, transition: 'border-color 0.15s', background: '#fff' }}
          onFocus={e => (e.target.style.borderColor = T.b600)}
          onBlur={e => (e.target.style.borderColor = T.s200)}
        />
        {/* must have send(input) onClick here */}
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.background = T.b700; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.b600; }}
          style={{ padding: '11px 18px', background: T.b600, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1, transition: 'all 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon id="send" size={15} color="#fff" /> Send
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

  useEffect(() => {
    if (!id) return;
    getAgent(Number(id))
      .then(setAgent)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!agent) return;
    await deleteAgent(agent.id);
    navigate('/dashboard');
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: T.s400, fontSize: 15 }}>Loading…</p>
      </main>
    </div>
  );

  if (error || !agent) return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ color: T.s400, fontSize: 15 }}>Agent not found.</p>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, fontWeight: 700, color: T.b600, background: 'none', border: 'none', cursor: 'pointer' }}>← Back to Dashboard</button>
      </main>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.s50, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <Sidebar />

      <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: T.s900, letterSpacing: '-0.6px', marginBottom: 4, marginTop: 0 }}>{agent.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusBadge active={agent.is_active ?? true} />
              {agent.created_at && (
                <span style={{ fontSize: 12, color: T.s400, fontWeight: 500 }}>
                  Created {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')}
            onMouseEnter={e => { e.currentTarget.style.background = T.s50; e.currentTarget.style.borderColor = T.s300; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = T.s200; }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#fff', border: `1.5px solid ${T.s200}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.s600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.15s' }}>
            <Icon id="chevLeft" size={14} /> Dashboard
          </button>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, flex: 1, minHeight: 0 }}>

          {/* Left: Agent info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Profile card */}
            <div style={{ background: '#fff', border: `1px solid ${T.s200}`, borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg,${T.b500},${T.v600})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon id="mic" color="#fff" size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: T.s900, letterSpacing: '-0.3px' }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: T.s400, marginTop: 2 }}>Voice Agent</div>
                </div>
              </div>
              <InfoBlock label="Services Offered" value={agent.services} />
              <InfoBlock label="Business Hours" value={agent.business_hours} />
              {!agent.services && !agent.business_hours && (
                <div style={{ fontSize: 13, color: T.s300, textAlign: 'center', padding: '12px 0' }}>
                  No details configured yet.
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 20, padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Danger Zone</div>
              <p style={{ fontSize: 13, color: T.s400, marginBottom: 14, lineHeight: 1.6, marginTop: 0 }}>Permanently delete this agent and all its data.</p>
              <button onClick={handleDelete}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{ width: '100%', padding: 9, background: 'transparent', border: '1.5px solid #fecaca', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#dc2626', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.12s' }}>
                Delete agent
              </button>
            </div>
          </div>

          {/* Right: Conversation Tester */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
            <ConvoTester agent={agent} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AgentPage;
