import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgent, deleteAgent, chatWithAgent, getCalendarStatus, getCalendarAuthUrl, updateAgent } from '../services/api';
import type { AgentConfig } from '../services/api';
import Sidebar from '../components/Sidebar';
import BusinessHoursEditor, { parseWeekHours, fmtTime } from '../components/BusinessHoursEditor';

/* ── ICONS ── */
const Ic = {
  Back: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>,
  Send: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  Phone: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>,
  Cal: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
};

/* ── SVG LOGOS ── */
const LogoGCal = () => (
  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" fill="white" stroke="#E0E0E0" strokeWidth="0.5"/>
    <path d="M8.5 3.5v4M15.5 3.5v4" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="3.5" y="7" width="17" height="2.5" fill="#4285F4"/>
    <text x="12" y="17.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#4285F4" fontFamily="sans-serif">31</text>
  </svg>
);

/* ── STATUS PILL ── */
const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
    background: active ? 'var(--green-light)' : '#F3F4F6',
    color: active ? 'var(--green)' : '#6B7280',
  }}>
    <div style={{
      width: 5, height: 5, borderRadius: '50%',
      background: active ? 'var(--green)' : '#9CA3AF',
      animation: active ? 'pip-pulse 2s ease-in-out infinite' : 'none',
    }} />
    {active ? 'Active' : 'Inactive'}
  </div>
);

/* ── TYPING INDICATOR ── */
const TypingIndicator: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'white', border: '1px solid var(--border)', borderRadius: 14, borderBottomLeftRadius: 4, width: 'fit-content' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: 5, height: 5, background: 'var(--text-soft)', borderRadius: '50%', animation: `tdot 1.4s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
    ))}
  </div>
);

const QUICK_PROMPTS = [
  "I'd like to book an appointment",
  "What are your available hours?",
  "Do you have any openings this week?",
  "Can I reschedule my appointment?",
];

type Message = { role: 'user' | 'assistant'; content: string; t: string };

/* ── RIGHT PANEL / CHAT ── */
const RightPanel: React.FC<{ agent: AgentConfig; calendarConnected: boolean | null }> = ({ agent, calendarConnected }) => {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const init = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isEmpty = msgs.length === 0 && !loading;

  useEffect(() => {
    if (bottomRef.current) {
      const el = bottomRef.current.parentElement!;
      el.scrollTop = el.scrollHeight;
    }
  }, [msgs, loading]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsgs = [...msgs, { role: 'user' as const, content: msg, t }];
    setMsgs(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const data = await chatWithAgent(agent.id, msg, msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })));
      setMsgs(prev => [...prev, { role: 'assistant', content: data.reply, t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having a little trouble right now. Could you try again in a moment?", t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--page-bg)' }}>
      {/* Chat topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, background: 'var(--plum)', borderRadius: 8, color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{init}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>Simulates how your agent responds to real customers</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill active={true} />
        </div>
      </div>

      {/* Chat body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        {!calendarConnected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'white', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,7,100,0.06)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>Google Calendar required</div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', maxWidth: 300, lineHeight: 1.6, marginTop: 6 }}>Connect your Google Calendar using the panel on the left to start testing.</div>
            </div>
          </div>
        ) : isEmpty ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'white', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,7,100,0.06)' }}>
              <Ic.Phone />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em', textAlign: 'center' }}>Start a test call</div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', textAlign: 'center', lineHeight: 1.6, maxWidth: 300, marginTop: 6 }}>Type as if you're a customer calling in. See how your agent responds.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 440 }}>
              {QUICK_PROMPTS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background: 'white', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '10px 14px', fontSize: 12, fontWeight: 500, color: 'var(--text-mid)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-ui)',
                  transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--lavender-mid)'; el.style.borderColor = 'var(--plum-xlight)'; el.style.color = 'var(--plum)'; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'white'; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-mid)'; }}
                >{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.role === 'assistant' ? 'var(--plum)' : 'var(--text-soft)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.role === 'assistant' ? init : 'You'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '72%' }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.55,
                    ...(m.role === 'assistant'
                      ? { background: 'white', border: '1px solid var(--border)', color: 'var(--text-dark)', borderBottomLeftRadius: 4 }
                      : { background: 'var(--plum)', color: 'white', borderBottomRightRadius: 4 })
                  }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 3, padding: '0 2px', textAlign: m.role === 'user' ? 'right' : 'left' }}>{m.t}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--plum)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{init}</div>
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ background: 'white', borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, opacity: calendarConnected ? 1 : 0.4, pointerEvents: calendarConnected ? 'auto' : 'none' }}>
        <div style={{ flex: 1, background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', transition: 'border-color 0.15s' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--plum-xlight)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--lavender-dark)')}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder={calendarConnected ? 'Type as a caller…' : 'Connect Google Calendar to start…'}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text-dark)', padding: '10px 0' }}
          />
        </div>
        <button onClick={() => send()} disabled={!input.trim() && msgs.length > 0} style={{
          background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8,
          padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'background 0.15s', opacity: (!input.trim() && msgs.length > 0) ? 0.4 : 1,
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--plum-mid)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--plum)')}
        >
          <Ic.Send /> Send
        </button>
      </div>
    </div>
  );
};

/* ── AGENT PAGE ── */
const AgentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [tone, setTone] = useState('Friendly');

  // Edit mode — allows updating name, services, hours, instructions inline
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', services: '', business_hours: '', agent_instructions: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getAgent(Number(id)).then(setAgent).catch(() => setPageError(true)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getCalendarStatus().then(d => setCalendarConnected(d.connected)).catch(() => setCalendarConnected(false));
  }, []);

  const handleConnectCalendar = async () => {
    if (!id) return;
    setCalendarLoading(true);
    try {
      const data = await getCalendarAuthUrl(`/agent/${id}`);
      window.location.href = data.url;
    } catch { setCalendarLoading(false); }
  };

  const handleDelete = async () => {
    if (!agent) return;
    await deleteAgent(agent.id);
    navigate('/dashboard');
  };

  // Enter edit mode pre-filled with current agent values
  const startEdit = () => {
    if (!agent) return;
    setEditForm({
      name: agent.name,
      services: agent.services ?? '',
      business_hours: agent.business_hours ?? '',
      agent_instructions: agent.agent_instructions ?? '',
    });
    setEditError(null);
    setEditMode(true);
  };

  const cancelEdit = () => { setEditMode(false); setEditError(null); };

  // Save edits back to the API and update local state so UI reflects changes immediately
  const saveEdit = async () => {
    if (!agent) return;
    if (!editForm.name.trim()) { setEditError('Agent name is required.'); return; }
    setEditSaving(true);
    try {
      const updated = await updateAgent(agent.id, {
        name: editForm.name.trim(),
        services: editForm.services || undefined,
        business_hours: editForm.business_hours || undefined,
        agent_instructions: editForm.agent_instructions || undefined,
      });
      setAgent(updated);
      setEditMode(false);
    } catch {
      setEditError('Failed to save. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)' }}>
        <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Loading…</p>
      </main>
    </div>
  );

  if (pageError || !agent) return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--page-bg)' }}>
        <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Agent not found.</p>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 13, fontWeight: 600, color: 'var(--plum-mid)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>← Back to Dashboard</button>
      </main>
    </div>
  );

  const init = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const createdDate = agent.created_at
    ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const servicesList = agent.services ? agent.services.split(',').map(s => s.trim()).filter(Boolean) : [];

  const weekHours = parseWeekHours(agent.business_hours ?? undefined);
  const hours = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
    const h = weekHours[d];
    return { d, t: h ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : null };
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>{agent.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusPill active={agent.is_active !== false} />
              {createdDate && <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Created {createdDate}</span>}
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, color: 'var(--text-soft)',
            background: 'none', border: '1px solid var(--border)', borderRadius: 7,
            padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
            transition: 'background 0.12s, color 0.12s',
          }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--lavender-bg)'; el.style.color = 'var(--text-dark)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'none'; el.style.color = 'var(--text-soft)'; }}
          >
            <Ic.Back /> Dashboard
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '272px 1fr', overflow: 'hidden' }}>

          {/* LEFT PANEL */}
          <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', overflowX: 'hidden', background: 'white', display: 'flex', flexDirection: 'column' }}>

            {/* Identity + Edit toggle */}
            <div style={panelSection}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, background: 'var(--plum)', borderRadius: 9, color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '0.02em' }}>{init}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>{agent.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>Voice Agent · {tone}</div>
                </div>
                {/* Toggle edit mode */}
                {!editMode ? (
                  <button onClick={startEdit} style={{ fontSize: 11, fontWeight: 600, color: 'var(--plum-mid)', background: 'var(--plum-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                    Edit
                  </button>
                ) : (
                  <button onClick={cancelEdit} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                    Cancel
                  </button>
                )}
              </div>
              {/* Error banner inside edit mode */}
              {editMode && editError && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', background: 'var(--red-light)', border: '1px solid #FECACA', borderRadius: 6, padding: '6px 10px' }}>
                  {editError}
                </div>
              )}
              {/* Name field in edit mode */}
              {editMode && (
                <div style={{ marginTop: 12 }}>
                  <label style={fieldLabelStyle}>Agent name *</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    style={fieldInputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--plum-xlight)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--lavender-dark)')}
                  />
                </div>
              )}
            </div>

            {/* Services — view or edit */}
            <div style={panelSection}>
              <div style={panelSectionTitle}>Services Offered</div>
              {editMode ? (
                <textarea
                  rows={3}
                  value={editForm.services}
                  onChange={e => setEditForm(f => ({ ...f, services: e.target.value }))}
                  placeholder="e.g. Haircut (30 min), Color (90 min)"
                  style={{ ...fieldInputStyle, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--plum-xlight)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--lavender-dark)')}
                />
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 500, lineHeight: 1.7 }}>
                  {servicesList.length > 0 ? servicesList.join(', ') : <span style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>No services configured</span>}
                </div>
              )}
            </div>

            {/* Agent Tone */}
            <div style={panelSection}>
              <div style={panelSectionTitle}>Agent Tone</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Friendly', 'Professional', 'Concise'].map(t => (
                  <div key={t} onClick={() => setTone(t)} style={{
                    flex: 1, textAlign: 'center', padding: '6px 8px',
                    fontSize: 12, fontWeight: t === tone ? 600 : 500, cursor: 'pointer',
                    border: `1px solid ${t === tone ? 'var(--plum)' : 'var(--border)'}`,
                    borderRadius: 7, color: t === tone ? 'white' : 'var(--text-soft)',
                    background: t === tone ? 'var(--plum)' : 'white',
                    transition: 'all 0.12s',
                  }}>{t}</div>
                ))}
              </div>
            </div>

            {/* Business Hours — view or edit */}
            <div style={panelSection}>
              <div style={panelSectionTitle}>Business Hours</div>
              {editMode ? (
                <BusinessHoursEditor
                  value={editForm.business_hours}
                  onChange={v => setEditForm(f => ({ ...f, business_hours: v }))}
                />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {hours.map(h => (
                      <tr key={h.d}>
                        <td style={{ padding: '4px 0', fontSize: 12, color: 'var(--text-soft)', fontWeight: 500, width: 36 }}>{h.d}</td>
                        <td style={{ padding: '4px 0', fontSize: 12, fontWeight: 600, color: h.t ? 'var(--text-dark)' : 'var(--text-soft)', fontStyle: h.t ? 'normal' : 'italic', textAlign: 'right' }}>
                          {h.t || 'Closed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Agent Instructions — always show, editable in edit mode */}
            <div style={panelSection}>
              <div style={panelSectionTitle}>Instructions</div>
              {editMode ? (
                <textarea
                  rows={4}
                  value={editForm.agent_instructions}
                  onChange={e => setEditForm(f => ({ ...f, agent_instructions: e.target.value }))}
                  placeholder="Tone, FAQs, cancellation policy, anything the agent should know…"
                  style={{ ...fieldInputStyle, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--plum-xlight)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--lavender-dark)')}
                />
              ) : (
                <div style={{ fontSize: 12, color: agent.agent_instructions ? 'var(--text-dark)' : 'var(--text-soft)', lineHeight: 1.6, fontStyle: agent.agent_instructions ? 'normal' : 'italic' }}>
                  {agent.agent_instructions || 'No instructions set'}
                </div>
              )}
            </div>

            {/* Integrations */}
            <div style={panelSection}>
              <div style={panelSectionTitle}>Integrations</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F3FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-dark)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LogoGCal />
                  </div>
                  Google Calendar
                </div>
                {calendarConnected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>
                    <div style={{ width: 5, height: 5, background: 'var(--green)', borderRadius: '50%' }} />Connected
                  </div>
                ) : (
                  <button onClick={handleConnectCalendar} disabled={calendarLoading} style={{ fontSize: 11, fontWeight: 600, color: 'var(--plum-mid)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    {calendarLoading ? 'Connecting…' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* Save / Cancel in edit mode */}
            {editMode && (
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  style={{ flex: 1, background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.65 : 1, fontFamily: 'var(--font-ui)' }}
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  style={{ flex: 1, background: 'none', color: 'var(--text-mid)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Danger Zone */}
            <div style={{ ...panelSection, marginTop: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Danger Zone</div>
              <div style={{ fontSize: 11, color: 'var(--text-soft)', lineHeight: 1.5, marginBottom: 12 }}>Permanently delete this agent and all its call history. This cannot be undone.</div>
              <button onClick={handleDelete} style={{
                width: '100%', background: 'none', border: '1px solid #FECACA',
                color: 'var(--red)', fontSize: 12, fontWeight: 600, padding: 8,
                borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >Delete agent</button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <RightPanel agent={agent} calendarConnected={calendarConnected} />
        </div>
      </div>
    </div>
  );
};

const panelSection: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border)',
};

const panelSectionTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: 'var(--text-soft)',
  marginBottom: 12, opacity: 0.7,
};

// Shared styles for edit-mode form fields
const fieldLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-soft)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)',
  borderRadius: 7, fontSize: 12, outline: 'none',
  fontFamily: 'var(--font-ui)', color: 'var(--text-dark)',
  boxSizing: 'border-box',
};

export default AgentPage;
