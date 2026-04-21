import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMetrics, getAgents, createAgent, deleteAgent } from '../services/api';
import type { AgentConfig } from '../services/api';
import Sidebar from '../components/Sidebar';
import { persistAppUserFromSession, supabase } from '../lib/supabaseClient';

const T = {
  b50: '#eff6ff', b100: '#dbeafe', b200: '#bfdbfe',
  b600: '#2563eb', b700: '#1d4ed8', v50: '#f5f3ff', v600: '#7c3aed',
  s50: '#f8fafc', s100: '#f1f5f9', s200: '#e2e8f0',
  s300: '#cbd5e1', s400: '#94a3b8', s500: '#64748b',
  s600: '#475569', s700: '#334155', s900: '#0f172a',
  green: '#22c55e',
};

type Metrics = { total_conversations: number; total_appointments_created: number };
const EMPTY_FORM = { name: '', services: '', business_hours: '', agent_instructions: '' };

/* ── Icons ─────────────────────────────────────── */
const Icon: React.FC<{ id: string; size?: number; color?: string }> = ({ id, size = 18, color = 'currentColor' }) => {
  const paths: Record<string, React.ReactNode> = {
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
};

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
        background: '#fff', borderRadius: 16, padding: 20,
        border: `1px solid ${h ? T.b200 : T.s200}`,
        boxShadow: h ? '0 8px 28px -8px rgba(37,99,235,0.12)' : '0 2px 8px rgba(15,23,42,0.04)',
        transition: 'all 0.15s', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: h ? T.b100 : T.b50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}>
            <Icon id="mic" color={T.b600} size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.s900, letterSpacing: '-0.2px' }}>{agent.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: T.green }} />
              <span style={{ fontSize: 11, color: T.s400, fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(agent.id); }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = T.s300)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.s300, padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.1s' }}
        >
          <Icon id="x" size={16} />
        </button>
      </div>
      {preview && <p style={{ fontSize: 12, color: T.s400, lineHeight: 1.55, margin: 0 }}>{preview}</p>}
      {date && <p style={{ fontSize: 11, color: T.s300, margin: 0 }}>Created {date}</p>}
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
        border: `2px dashed ${h ? T.b600 : T.s200}`,
        borderRadius: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 28, cursor: 'pointer', transition: 'all 0.15s', minHeight: 150, gap: 8,
        background: h ? T.b50 : 'transparent',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 11, background: T.s100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon id="plus" size={18} color={T.s400} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.s400, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>New Agent</span>
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: `1.5px solid ${T.s200}`, borderRadius: 10,
  fontSize: 14, outline: 'none', color: T.s900,
  boxSizing: 'border-box', transition: 'border-color 0.15s',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  background: '#fff',
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
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.32)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24, backdropFilter: 'blur(4px)',
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: '#fff', borderRadius: 24, padding: 36,
        width: '100%', maxWidth: 500,
        boxShadow: '0 24px 80px rgba(15,23,42,0.16)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: T.s900, letterSpacing: '-0.5px', margin: 0 }}>Create a new agent</h3>
          <p style={{ fontSize: 14, color: T.s400, marginTop: 5, marginBottom: 0 }}>Your agent will be live in minutes.</p>
        </div>
        <button onClick={onClose} style={{ color: T.s300, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          onMouseEnter={e => (e.currentTarget.style.color = T.s600)}
          onMouseLeave={e => (e.currentTarget.style.color = T.s300)}>
          <Icon id="x" size={20} />
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {FIELDS.map(({ key, label, placeholder, required, textarea, rows }) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.s700, marginBottom: 6 }}>
            {label}{required && <span style={{ color: T.b600 }}> *</span>}
          </label>
          {textarea ? (
            <textarea
              rows={rows}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => (e.target.style.borderColor = T.b600)}
              onBlur={e => (e.target.style.borderColor = T.s200)}
            />
          ) : (
            <input
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = T.b600)}
              onBlur={e => (e.target.style.borderColor = T.s200)}
            />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{
          padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: 'transparent', color: T.s700, border: `1.5px solid ${T.s200}`,
          cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>Cancel</button>
        <button onClick={onSubmit} disabled={saving} style={{
          padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: T.b600, color: '#fff', border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>{saving ? 'Creating…' : 'Create agent'}</button>
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
    setSaving(true);
    setError(null);
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.s50, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <Sidebar />

      <main style={{ flex: 1, overflowY: 'auto', padding: '44px 52px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.s900, letterSpacing: '-0.8px', marginBottom: 6, margin: 0 }}>
            {greeting} ☀️
          </h1>
          <p style={{ fontSize: 15, color: T.s400, fontWeight: 500, marginTop: 6, marginBottom: 0 }}>
            Here's how your agents are performing.
          </p>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18, marginBottom: 48, maxWidth: 600 }}>
          {[
            { label: 'Total Conversations', value: metrics.total_conversations, accent: T.b600, bg: T.b50 },
            { label: 'Appointments Booked', value: metrics.total_appointments_created, accent: T.v600, bg: T.s50 },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background: '#fff', border: `1px solid ${T.s200}`, borderRadius: 16, padding: '26px 28px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: accent }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.s400, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: T.s900, letterSpacing: '-2px', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Agents */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, maxWidth: 900 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.s900, letterSpacing: '-0.4px', margin: 0 }}>Your Agents</h2>
              <p style={{ fontSize: 13, color: T.s400, marginTop: 3, marginBottom: 0 }}>
                {agents.length} agent{agents.length !== 1 ? 's' : ''} active
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16, maxWidth: 900 }}>
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
  );
};

export default Dashboard;
