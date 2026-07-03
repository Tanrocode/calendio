import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BusinessHoursEditor from '../components/BusinessHoursEditor';
import {
  getAgents, createAgent, deleteAgent, getCalendarStatus, getAgentStats,
} from '../services/api';
import type { AgentConfig, AgentStat } from '../services/api';

type FormState = { name: string; address: string; services: string; business_hours: string; agent_instructions: string };
const EMPTY_FORM: FormState = { name: '', address: '', services: '', business_hours: '', agent_instructions: '' };

/* ── ICONS ── */
const Ic = {
  Plus: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  X: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Trash: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/></svg>,
  Phone: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>,
  Cal: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Doc: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M6 21h12a2 2 0 002-2V7l-5-5H6a2 2 0 00-2 2v15a2 2 0 002 2z"/></svg>,
  Pin: () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Check: () => <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  Dot: () => <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>,
  Chevron: () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>,
};

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

/* ── CONNECTION ROW ── */
const ConnectionRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  connected: boolean;
}> = ({ icon, label, value, connected }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    background: connected ? 'var(--lavender-bg)' : '#FAFAFE',
    border: `1px solid ${connected ? 'var(--lavender-dark)' : 'var(--border)'}`,
  }}>
    <div style={{
      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: connected ? 'var(--plum-bg)' : 'white',
      color: connected ? 'var(--plum-mid)' : 'var(--text-soft)',
      border: `1px solid ${connected ? 'var(--lavender-dark)' : 'var(--border)'}`,
    }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{
        fontSize: 12, fontWeight: 600, marginTop: 1,
        color: connected ? 'var(--text-dark)' : 'var(--text-soft)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
    <div style={{
      flexShrink: 0, width: 16, height: 16, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: connected ? 'var(--green)' : '#E5E7EB',
      color: 'white',
    }}>{connected ? <Ic.Check /> : <Ic.Dot />}</div>
  </div>
);

/* ── AGENT CARD ── */
const AgentCard: React.FC<{
  agent: AgentConfig;
  stat?: AgentStat;
  color: string;
  calendarConnected: boolean;
  onConfigure: () => void;
  onDelete: () => void;
}> = ({ agent, stat, color, calendarConnected, onConfigure, onDelete }) => {
  const [hover, setHover] = useState(false);
  const init = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const phone = agent.agentphone_number;
  const hasContext = !!agent.context && agent.context.trim().length > 0;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 14,
        padding: '18px 18px 14px', display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        borderColor: hover ? 'var(--plum-xlight)' : 'var(--border)',
        boxShadow: hover ? '0 6px 20px rgba(59,7,100,0.06)' : 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, background: color, color: 'white',
          fontSize: 14, fontWeight: 700, letterSpacing: '0.02em', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{init}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agent.name}
          </div>
          {agent.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 11, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Ic.Pin /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.address}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <StatusPill active={agent.is_active !== false} />
          </div>
        </div>
        <button
          onClick={onDelete}
          title="Delete agent"
          style={{
            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-soft)', padding: 6, borderRadius: 6,
            display: 'flex', transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-soft)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Ic.Trash />
        </button>
      </div>

      {/* Connections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <ConnectionRow
          icon={<Ic.Phone />}
          label="Phone number"
          value={phone || 'Not provisioned'}
          connected={!!phone}
        />
        <ConnectionRow
          icon={<Ic.Cal />}
          label="Google Calendar"
          value={calendarConnected ? 'Connected' : 'Not connected'}
          connected={calendarConnected}
        />
        <ConnectionRow
          icon={<Ic.Doc />}
          label="Knowledge base"
          value={hasContext ? 'Uploaded' : 'No context added'}
          connected={hasContext}
        />
      </div>

      {/* Stats mini-row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
        padding: '10px 0 12px', borderTop: '1px solid var(--lavender-bg)',
        marginBottom: 12,
      }}>
        <StatMini label="Calls" value={stat?.total_calls ?? 0} />
        <StatMini label="Booked" value={stat?.appointments_booked ?? 0} accent />
        <StatMini label="Conv." value={stat?.total_calls ? `${stat.conversion_rate}%` : '—'} />
      </div>

      {/* Configure */}
      <button
        onClick={onConfigure}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          width: '100%', padding: '9px 14px', borderRadius: 8,
          background: hover ? 'var(--plum)' : 'var(--plum-bg)',
          color: hover ? 'white' : 'var(--plum-mid)',
          border: `1px solid ${hover ? 'var(--plum)' : 'var(--lavender-dark)'}`,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        }}
      >
        Configure <Ic.Chevron />
      </button>
    </div>
  );
};

const StatMini: React.FC<{ label: string; value: string | number; accent?: boolean }> = ({ label, value, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: accent ? 'var(--plum-mid)' : 'var(--text-dark)' }}>{value}</div>
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
  </div>
);

/* ── CREATE MODAL ── */
type FieldDef = { key: keyof FormState; label: string; placeholder: string; required?: boolean; textarea?: boolean; rows?: number };
const FIELDS: FieldDef[] = [
  { key: 'name',     label: 'Agent name',       placeholder: 'e.g. Booking Assistant', required: true },
  { key: 'address',  label: 'Business address', placeholder: 'e.g. 123 Main St, San Francisco, CA 94103' },
  { key: 'services', label: 'Services offered', placeholder: 'e.g. Haircut (30 min), Color (90 min)', textarea: true, rows: 2 },
];
const INSTRUCTION_FIELD: FieldDef = { key: 'agent_instructions', label: 'Agent instructions', placeholder: 'Tone, FAQs, cancellation policy…', textarea: true, rows: 3 };

const CreateModal: React.FC<{
  onClose: () => void;
  error: string | null;
  saving: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
}> = ({ onClose, error, saving, form, setForm, onSubmit }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(28,10,48,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 24, backdropFilter: 'blur(6px)',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: 'white', borderRadius: 20, padding: '36px 36px 32px',
      width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(59,7,100,0.18)',
      fontFamily: 'var(--font-ui)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em', margin: 0 }}>New agent</h3>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4, marginBottom: 0 }}>Live in minutes.</p>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-soft)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Ic.X />
        </button>
      </div>
      {error && (
        <div style={{ background: 'var(--red-light)', border: '1px solid #FECACA', color: 'var(--red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {FIELDS.map(({ key, label, placeholder, required, textarea, rows }) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            {label}{required ? <span style={{ color: 'var(--plum-mid)' }}> *</span> : null}
          </label>
          {textarea ? (
            <textarea rows={rows} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', color: 'var(--text-dark)', resize: 'vertical' }}
            />
          ) : (
            <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', color: 'var(--text-dark)' }}
            />
          )}
        </div>
      ))}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          Business hours
        </label>
        <BusinessHoursEditor
          value={form.business_hours}
          onChange={v => setForm(f => ({ ...f, business_hours: v }))}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
          {INSTRUCTION_FIELD.label}
        </label>
        <textarea rows={INSTRUCTION_FIELD.rows} value={form.agent_instructions}
          onChange={e => setForm(f => ({ ...f, agent_instructions: e.target.value }))}
          placeholder={INSTRUCTION_FIELD.placeholder}
          style={{ width: '100%', padding: '9px 12px', background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', color: 'var(--text-dark)', resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: 'transparent', color: 'var(--text-mid)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
          Cancel
        </button>
        <button onClick={onSubmit} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: 'var(--plum)', color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.65 : 1, fontFamily: 'var(--font-ui)' }}>
          {saving ? 'Creating…' : 'Create agent'}
        </button>
      </div>
    </div>
  </div>
);

/* ── PAGE ── */
const AGENT_COLORS = ['var(--plum)', 'var(--plum-mid)', '#7C3AED', '#A855F7', '#6D28D9', '#5B21B6'];

const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [statsByAgent, setStatsByAgent] = useState<Record<number, AgentStat>>({});
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [agentsRes, statsRes, calRes] = await Promise.allSettled([
        getAgents(), getAgentStats(), getCalendarStatus(),
      ]);
      if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value);
      if (statsRes.status === 'fulfilled') {
        const byId: Record<number, AgentStat> = {};
        for (const a of statsRes.value.agents) byId[a.agent_id] = a;
        setStatsByAgent(byId);
      }
      if (calRes.status === 'fulfilled') setCalendarConnected(calRes.value.connected);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Agent name is required.'); return; }
    setSaving(true); setError(null);
    try {
      const newAgent = await createAgent({
        name: form.name.trim(),
        address: form.address || undefined,
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
    if (!confirm('Delete this agent? This cannot be undone.')) return;
    await deleteAgent(id);
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  const activeCount = agents.filter(a => a.is_active !== false).length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
              My <em style={{ fontFamily: 'var(--font-brand)', fontStyle: 'italic', fontWeight: 600, color: 'var(--plum-mid)' }}>Agents</em>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
              {agents.length} configured · {activeCount} active
            </div>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8,
            padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--plum-mid)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--plum)')}
          >
            <Ic.Plus /> New Agent
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px 40px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 320, borderRadius: 14, background: 'var(--lavender-bg)', animation: 'pulse 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '80px 20px', gap: 12,
              background: 'white', borderRadius: 14, border: '1px dashed var(--lavender-dark)',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>No agents yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>Spin up your first voice agent to start booking calls.</div>
              <button onClick={() => setShowModal(true)} style={{
                marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8,
                padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}>
                <Ic.Plus /> Create your first agent
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
              {agents.map((agent, i) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  stat={statsByAgent[agent.id]}
                  color={AGENT_COLORS[i % AGENT_COLORS.length]}
                  calendarConnected={calendarConnected}
                  onConfigure={() => navigate(`/agent/${agent.id}`)}
                  onDelete={() => handleDelete(agent.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CreateModal
          onClose={() => { setShowModal(false); setForm(EMPTY_FORM); setError(null); }}
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

export default AgentsPage;
