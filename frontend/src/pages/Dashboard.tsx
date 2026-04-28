import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMetrics, getAgents, createAgent, deleteAgent } from '../services/api';
import type { AgentConfig } from '../services/api';
import Sidebar from '../components/Sidebar';
import { persistAppUserFromSession, supabase } from '../lib/supabaseClient';

const T = {
  forest:       '#1d8c63',
  forestDeep:   '#177350',
  forestSoft:   '#ecfdf5',
  forestMid:    '#a7f3d0',
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
};

const font = "'Bricolage Grotesque', sans-serif";

type Metrics = { total_conversations: number; total_appointments_created: number };
const EMPTY_FORM = { name: '', services: '', business_hours: '', agent_instructions: '' };

/* ── Icons ─────────────────────────────────────── */
const MicIcon: React.FC<{ size?: number; color?: string }> = ({ size = 17, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const PlusIcon: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const XIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ── Agent Card ────────────────────────────────── */
const AgentCard: React.FC<{ agent: AgentConfig; onDelete: (id: number) => void }> = ({ agent, onDelete }) => {
  const navigate = useNavigate();
  const [h, setH] = useState(false);
  const date = agent.created_at
    ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const preview = agent.services
    ? agent.services.length > 60 ? agent.services.slice(0, 60) + '…' : agent.services
    : null;

  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={() => navigate(`/agent/${agent.id}`)}
      style={{
        background: T.surface, borderRadius: 14, padding: '18px 18px 16px',
        border: `1px solid ${h ? T.forestMid : T.border}`,
        boxShadow: h ? '0 8px 24px -8px rgba(26,92,58,0.16)' : '0 1px 4px rgba(17,28,23,0.04)',
        transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: h ? T.forestSoft : T.surfaceAlt,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}>
            <MicIcon color={h ? T.forest : T.secondary} size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, letterSpacing: '-0.2px', fontFamily: font }}>{agent.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: 99, background: T.green }} />
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, fontFamily: font }}>Active</span>
            </div>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(agent.id); }}
          onMouseEnter={e => (e.currentTarget.style.color = '#b91c1c')}
          onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.1s' }}
        >
          <XIcon size={14} />
        </button>
      </div>
      {preview && <p style={{ fontSize: 12, color: T.secondary, lineHeight: 1.55, margin: 0, fontFamily: font }}>{preview}</p>}
      {date && <p style={{ fontSize: 11, color: T.muted, margin: 0, fontFamily: font }}>Created {date}</p>}
    </div>
  );
};

/* ── Add Card ──────────────────────────────────── */
const AddCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        border: `1.5px dashed ${h ? T.forest : T.border}`,
        borderRadius: 14,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, cursor: 'pointer', transition: 'all 0.15s', minHeight: 120, gap: 8,
        background: h ? T.forestSoft : 'transparent',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: h ? T.forestSoft : T.surfaceAlt,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}>
        <PlusIcon size={16} color={h ? T.forest : T.muted} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: h ? T.forest : T.muted, fontFamily: font, transition: 'color 0.15s' }}>New Agent</span>
    </div>
  );
};

/* ── Create Modal ──────────────────────────────── */
type Field = { key: keyof typeof EMPTY_FORM; label: string; placeholder: string; required?: boolean; textarea?: boolean; rows?: number };
const FIELDS: Field[] = [
  { key: 'name', label: 'Agent name', placeholder: 'e.g. Booking Assistant', required: true },
  { key: 'services', label: 'Services offered', placeholder: 'e.g. Haircut (30 min), Color (90 min)', textarea: true, rows: 2 },
  { key: 'business_hours', label: 'Business hours', placeholder: 'e.g. Mon–Fri 9am–6pm, Sat 10am–4pm' },
  { key: 'agent_instructions', label: 'Agent instructions', placeholder: 'Tone, FAQs, cancellation policy…', textarea: true, rows: 3 },
];

const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: `1.5px solid ${T.border}`, borderRadius: 10,
  fontSize: 14, outline: 'none', color: T.ink,
  boxSizing: 'border-box', transition: 'border-color 0.15s',
  fontFamily: font, background: T.bg,
};

const CreateModal: React.FC<{
  onClose: () => void;
  onCreate: (agent: AgentConfig) => void;
  error: string | null;
  saving: boolean;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  onSubmit: () => void;
}> = ({ onClose, error, saving, form, setForm, onSubmit }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(17,28,23,0.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24, backdropFilter: 'blur(4px)',
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: T.surface, borderRadius: 20, padding: '36px 36px 32px',
        width: '100%', maxWidth: 500,
        boxShadow: '0 24px 80px rgba(17,28,23,0.14)',
        fontFamily: font,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.4px', margin: 0, fontFamily: font }}>New agent</h3>
          <p style={{ fontSize: 13, color: T.secondary, marginTop: 4, marginBottom: 0, fontFamily: font }}>Live in minutes.</p>
        </div>
        <button onClick={onClose}
          onMouseEnter={e => (e.currentTarget.style.color = T.body)}
          onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.1s' }}>
          <XIcon size={20} />
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef5f5', border: '1px solid #f5c6c6', color: '#8b2020', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, fontFamily: font }}>
          {error}
        </div>
      )}

      {FIELDS.map(({ key, label, placeholder, required, textarea, rows }) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.secondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: font }}>
            {label}{required && <span style={{ color: T.forest }}> *</span>}
          </label>
          {textarea ? (
            <textarea
              rows={rows}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{ ...inputBase, resize: 'vertical' }}
              onFocus={e => (e.target.style.borderColor = T.forest)}
              onBlur={e => (e.target.style.borderColor = T.border)}
            />
          ) : (
            <input
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = T.forest)}
              onBlur={e => (e.target.style.borderColor = T.border)}
            />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button onClick={onClose}
          onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.borderColor = T.borderStrong; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.border; }}
          style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, background: 'transparent', color: T.body, border: `1.5px solid ${T.border}`, cursor: 'pointer', fontFamily: font, transition: 'all 0.15s' }}>
          Cancel
        </button>
        <button onClick={onSubmit} disabled={saving}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = T.forestDeep; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.forest; }}
          style={{ padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, background: T.forest, color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.65 : 1, fontFamily: font, transition: 'all 0.15s' }}>
          {saving ? 'Creating…' : 'Create agent'}
        </button>
      </div>
    </div>
  </div>
);

/* ── Dashboard ─────────────────────────────────── */
const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>({ total_conversations: 0, total_appointments_created: 0 });
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth'; return; }
      persistAppUserFromSession(session);
      const [metricsResult, agentsResult] = await Promise.allSettled([getMetrics(), getAgents()]);
      if (metricsResult.status === 'fulfilled') setMetrics(metricsResult.value.metrics);
      if (agentsResult.status === 'fulfilled') setAgents(agentsResult.value);
    };
    init();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Agent name is required.'); return; }
    setSaving(true); setError(null);
    try {
      const newAgent = await createAgent({
        name: form.name.trim(),
        services: form.services || undefined,
        business_hours: form.business_hours || undefined,
        agent_instructions: form.agent_instructions || undefined,
      });
      setAgents(prev => [newAgent, ...prev]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch {
      setError('Failed to create agent. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAgent(id);
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');`}</style>
      <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: font }}>
        <Sidebar />

        <main style={{ flex: 1, overflowY: 'auto', padding: '48px 56px' }}>

          {/* Header */}
          <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.6px', margin: 0, fontFamily: font }}>
              {greeting}
            </h1>
            <button
              onClick={handleSignOut}
              onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.borderColor = T.borderStrong; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; }}
              style={{ padding: '9px 18px', background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.body, cursor: 'pointer', fontFamily: font, transition: 'all 0.15s', flexShrink: 0 }}
            >
              Sign out
            </button>
          </div>

          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, maxWidth: 520, marginBottom: 48 }}>
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
              padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: font }}>
                Conversations
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, color: T.ink, letterSpacing: '-2px', lineHeight: 1, fontFamily: font }}>
                {metrics.total_conversations}
              </div>
            </div>
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
              padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: font }}>
                Appointments booked
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, color: T.forest, letterSpacing: '-2px', lineHeight: 1, fontFamily: font }}>
                {metrics.total_appointments_created}
              </div>
            </div>
          </div>

          {/* Agents section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, maxWidth: 900 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: '-0.3px', margin: 0, fontFamily: font }}>Your Agents</h2>
                <p style={{ fontSize: 12, color: T.muted, marginTop: 3, marginBottom: 0, fontFamily: font }}>
                  {agents.length} agent{agents.length !== 1 ? 's' : ''} configured
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                onMouseEnter={e => { e.currentTarget.style.background = T.forestDeep; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.forest; }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: T.forest, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: font, transition: 'background 0.15s' }}
              >
                <PlusIcon size={13} color="#fff" /> New agent
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(224px, 1fr))', gap: 14, maxWidth: 900 }}>
              {agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
              ))}
              <AddCard onClick={() => setShowModal(true)} />
            </div>
          </div>
        </main>

        {showModal && (
          <CreateModal
            onClose={() => { setShowModal(false); setForm(EMPTY_FORM); setError(null); }}
            onCreate={a => setAgents(prev => [a, ...prev])}
            error={error}
            saving={saving}
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
          />
        )}
      </div>
    </>
  );
};

export default Dashboard;
