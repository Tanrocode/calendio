import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMetrics, getAgents, createAgent, deleteAgent, getRecentActivity } from '../services/api';
import type { AgentConfig, ConversationRow } from '../services/api';
import Sidebar from '../components/Sidebar';
import BusinessHoursEditor from '../components/BusinessHoursEditor';
import { persistAppUserFromSession, supabase } from '../lib/supabaseClient';
import { getUpcomingEvents, type CalendarEventRow } from '../lib/calendarDemoApi';

type Metrics = { total_conversations: number; conversations_today: number; total_appointments_created: number };
const EMPTY_FORM = { name: '', services: '', business_hours: '', agent_instructions: '' };

// Shape returned by the dashboard/metrics upcoming_appointments field
type SupabaseAppt = { customer_name: string; service: string; start_time: string; end_time: string };

/* ── ICONS ── */
const Ic = {
  Plus: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  Trend: () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  Chevron: () => <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>,
  X: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Clock: () => <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>,
};

/* ── STAT TILE ── */
const StatTile: React.FC<{ label: string; value: string; delta?: string; up?: boolean; accent?: 'accent' | 'green' }> = ({ label, value, delta, up, accent }) => (
  <div style={{
    background: 'white', border: '1px solid var(--border)', borderRadius: 12,
    padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6,
  }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
    <div style={{
      fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
      color: accent === 'accent' ? 'var(--plum-mid)' : accent === 'green' ? 'var(--green)' : 'var(--text-dark)',
    }}>{value}</div>
    {delta && (
      <div style={{ fontSize: 11, fontWeight: 500, color: up ? 'var(--green)' : 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {up && <Ic.Trend />}{delta}
      </div>
    )}
  </div>
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

type FieldDef = { key: keyof typeof EMPTY_FORM; label: string; placeholder: string; required?: boolean; textarea?: boolean; rows?: number };

/* ── CREATE MODAL ── */
const FIELDS_BEFORE: FieldDef[] = [
  { key: 'name',     label: 'Agent name',       placeholder: 'e.g. Booking Assistant', required: true },
  { key: 'services', label: 'Services offered', placeholder: 'e.g. Haircut (30 min), Color (90 min)', textarea: true, rows: 2 },
];
const FIELDS_AFTER: FieldDef[] = [
  { key: 'agent_instructions', label: 'Agent instructions', placeholder: 'Tone, FAQs, cancellation policy…', textarea: true, rows: 3 },
];

const CreateModal: React.FC<{
  onClose: () => void;
  error: string | null;
  saving: boolean;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  onSubmit: () => void;
}> = ({ onClose, error, saving, form, setForm, onSubmit }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(28,10,48,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 24, backdropFilter: 'blur(6px)',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: 'white', borderRadius: 20, padding: '36px 36px 32px',
      width: '100%', maxWidth: 480,
      boxShadow: '0 24px 80px rgba(59,7,100,0.18)',
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
      {[...FIELDS_BEFORE, ...FIELDS_AFTER].map(({ key, label, placeholder, required, textarea, rows }) => {
        const isBusiness = key === 'agent_instructions';
        return (
          <React.Fragment key={key}>
            {isBusiness && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Business hours
                </label>
                <BusinessHoursEditor
                  value={form.business_hours}
                  onChange={v => setForm(f => ({ ...f, business_hours: v }))}
                />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                {label}{required ? <span style={{ color: 'var(--plum-mid)' }}> *</span> : null}
              </label>
              {textarea ? (
                <textarea rows={rows} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', color: 'var(--text-dark)', resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--plum-xlight)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--lavender-dark)')}
                />
              ) : (
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', color: 'var(--text-dark)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--plum-xlight)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--lavender-dark)')}
                />
              )}
            </div>
          </React.Fragment>
        );
      })}
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

/* ── TODAY'S SCHEDULE ── */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return iso;
  }
}

// TodaySchedule shows Google Calendar events when connected; falls back to Supabase appointments
const TodaySchedule: React.FC<{ today: string; supabaseAppts?: SupabaseAppt[] }> = ({ today, supabaseAppts = [] }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calConnected, setCalConnected] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await getUpcomingEvents({ hours_ahead: 16, max_results: 20 });
        const todayStr = new Date().toDateString();
        const todayEvents = rows.filter(ev => new Date(ev.start).toDateString() === todayStr);
        setEvents(todayEvents);
        setCalConnected(true);
      } catch (e: any) {
        // Only treat 401 as "not connected" — everything else is a real error
        const status = e?.response?.status;
        if (status === 401) {
          setCalConnected(false);
        } else {
          // Connected but something else went wrong — still show as connected
          console.error('Schedule fetch error:', e);
          setCalConnected(true);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // When Google Calendar is not connected, convert Supabase appointments to display format
  const todayStr = new Date().toDateString();
  const fallbackEvents: CalendarEventRow[] = supabaseAppts
    .filter(a => new Date(a.start_time).toDateString() === todayStr)
    .map((a, i) => ({
      id: `supabase-${i}`,
      summary: a.service || 'Appointment',
      start: a.start_time,
      end: a.end_time,
      html_link: '',
      description_snippet: a.customer_name || '',
    }));

  const dateLabel = today.split(',').slice(1).join(',').trim();

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Today's Schedule</div>
          <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>{dateLabel}</div>
        </div>
        <button
          onClick={() => navigate('/calendar-demo')}
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--plum-mid)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          Calendar <Ic.Chevron />
        </button>
      </div>

      {/* body */}
      {loading ? (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--lavender-bg)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ) : !calConnected && fallbackEvents.length === 0 ? (
        // No Google Calendar and no Supabase appointments either
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', opacity: 0.35 }}>Not connected</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', textAlign: 'center' }}>Connect Google Calendar to see your schedule</div>
          <button
            onClick={() => navigate('/calendar-demo')}
            style={{ marginTop: 6, padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'var(--plum-bg)', color: 'var(--plum-mid)', border: '1px solid var(--lavender-dark)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
          >
            Connect →
          </button>
        </div>
      ) : (calConnected ? events : fallbackEvents).length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', opacity: 0.35 }}>All clear today</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>No appointments scheduled</div>
        </div>
      ) : (
        <div style={{ padding: '10px 0' }}>
          {/* Show Google Calendar events when connected; otherwise show Supabase appointments */}
          {(calConnected ? events : fallbackEvents).map((ev, i, arr) => {
            const isNext = i === 0;
            return (
              <div
                key={ev.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '9px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--lavender-bg)' : 'none',
                  background: isNext ? 'var(--plum-bg)' : 'white',
                  transition: 'background 0.1s',
                }}
              >
                {/* time column */}
                <div style={{ flexShrink: 0, width: 54, textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isNext ? 'var(--plum-mid)' : 'var(--text-mid)' }}>
                    {formatTime(ev.start)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 1 }}>
                    {formatTime(ev.end)}
                  </div>
                </div>

                {/* accent line */}
                <div style={{
                  width: 3, flexShrink: 0, borderRadius: 4, alignSelf: 'stretch',
                  background: isNext ? 'var(--plum-mid)' : 'var(--lavender-dark)',
                  minHeight: 32,
                }} />

                {/* event info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: isNext ? 'var(--plum)' : 'var(--text-dark)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ev.summary || '(no title)'}
                  </div>
                  {ev.description_snippet && (
                    <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.description_snippet}
                    </div>
                  )}
                </div>

                {/* "next" badge */}
                {isNext && (
                  <span style={{
                    flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 100, background: 'var(--plum)', color: 'white',
                    letterSpacing: '0.05em', textTransform: 'uppercase', alignSelf: 'center',
                  }}>Next</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── DASHBOARD ── */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>({ total_conversations: 0, conversations_today: 0, total_appointments_created: 0 });
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [recentActivity, setRecentActivity] = useState<ConversationRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  // Upcoming appointments from Supabase — used as fallback in TodaySchedule when Google Calendar isn't connected
  const [upcomingAppts, setUpcomingAppts] = useState<SupabaseAppt[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth'; return; }
      persistAppUserFromSession(session);
      const fullName = session.user.user_metadata?.full_name || session.user.email || '';
      setUserName(fullName.split(' ')[0]);
      const [metricsResult, agentsResult] = await Promise.allSettled([getMetrics(), getAgents()]);
      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value.metrics);
        setUpcomingAppts(metricsResult.value.upcoming_appointments ?? []);
      }
      if (agentsResult.status === 'fulfilled') setAgents(agentsResult.value);

      // Fetch recent conversations for the activity feed
      try {
        const activity = await getRecentActivity();
        setRecentActivity(activity);
      } catch {
        // Non-fatal — activity feed just stays empty
      } finally {
        setActivityLoading(false);
      }
    };
    init();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Agent name is required.'); return; }
    setSaving(true); setError(null);
    try {
      const newAgent = await createAgent({ name: form.name.trim(), services: form.services || undefined, business_hours: form.business_hours || undefined, agent_instructions: form.agent_instructions || undefined });
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

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const rate = metrics.total_conversations > 0
    ? Math.round((metrics.total_appointments_created / metrics.total_conversations) * 100) + '%'
    : '—';
  const activeCount = agents.filter(a => a.is_active !== false).length;
  const agentColors = ['var(--plum)', 'var(--plum-mid)', 'var(--plum-light)'];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
              Welcome back,{' '}
              <em style={{ fontFamily: 'var(--font-brand)', fontStyle: 'italic', fontWeight: 600, color: 'var(--plum-mid)' }}>{userName || 'there'}</em>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>{today}</div>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--plum-mid)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--plum)')}
          >
            <Ic.Plus /> New Agent
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <StatTile label="Conversations" value={String(metrics.total_conversations)} delta={`+${metrics.conversations_today} today`} up={metrics.conversations_today > 0} />
            <StatTile label="Appointments Booked" value={String(metrics.total_appointments_created)} delta="+0 today" up={false} accent="accent" />
            <StatTile label="Booking Rate" value={rate} accent="green" />
            <StatTile label="Active Agents" value={`${activeCount} / ${agents.length}`} delta={agents.length - activeCount > 0 ? `${agents.length - activeCount} inactive` : undefined} />
          </div>

          {/* Agents table */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Agents</div>
                <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>{agents.length} configured</div>
              </div>
              <button onClick={() => setShowModal(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'white', color: 'var(--text-mid)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--lavender-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <Ic.Plus /> New Agent
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Agent', 'Status', 'Created', '', ''].map((h, i) => (
                    <th key={i} style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--text-soft)',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                      padding: '10px 20px', textAlign: 'left',
                      background: '#FAFAFE', borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, i) => {
                  const init = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const createdDate = agent.created_at
                    ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—';
                  return (
                    <AgentRow
                      key={agent.id}
                      init={init}
                      color={agentColors[i % agentColors.length]}
                      name={agent.name}
                      type="Voice Agent"
                      active={agent.is_active !== false}
                      created={createdDate}
                      onConfigure={() => navigate(`/agent/${agent.id}`)}
                      onDelete={() => handleDelete(agent.id)}
                    />
                  );
                })}
                <tr>
                  <td colSpan={5} style={{ padding: '10px 20px' }}>
                    <button onClick={() => setShowModal(true)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'none', border: '1px dashed var(--lavender-dark)',
                      borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-soft)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                    }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--lavender-bg)'; el.style.color = 'var(--plum-mid)'; el.style.borderColor = 'var(--plum-xlight)'; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'none'; el.style.color = 'var(--text-soft)'; el.style.borderColor = 'var(--lavender-dark)'; }}
                    >
                      <Ic.Plus /> Add agent
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
            {/* Recent Activity — populated from conversations table after each chat */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Recent Activity</div>
                <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{recentActivity.length} conversation{recentActivity.length !== 1 ? 's' : ''}</span>
              </div>
              {activityLoading ? (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 52, borderRadius: 8, background: 'var(--lavender-bg)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', opacity: 0.35 }}>No activity yet</div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Conversations will appear here once your agent handles chats</div>
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {recentActivity.map((conv, i) => {
                    const ts = conv.ended_at
                      ? new Date(conv.ended_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                      : '';
                    return (
                      <div key={conv.id ?? i} style={{
                        padding: '12px 20px',
                        borderBottom: i < recentActivity.length - 1 ? '1px solid var(--lavender-bg)' : 'none',
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--text-soft)', color: 'white', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>U</div>
                          <div style={{ fontSize: 12, color: 'var(--text-dark)', flex: 1, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {conv.summary}
                          </div>
                        </div>
                        {ts && (
                          <div style={{ fontSize: 10, color: 'var(--text-soft)', marginLeft: 28, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Ic.Clock />{ts}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Schedule — Google Calendar when connected, Supabase appointments as fallback */}
            <TodaySchedule today={today} supabaseAppts={upcomingAppts} />
          </div>
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

/* ── AGENT TABLE ROW ── */
const AgentRow: React.FC<{
  init: string; color: string; name: string; type: string;
  active: boolean; created: string;
  onConfigure: () => void; onDelete: () => void;
}> = ({ init, color, name, type, active, created, onConfigure, onDelete }) => {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onClick={onConfigure}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#FAFAFE' : 'white', cursor: 'pointer', transition: 'background 0.12s' }}
    >
      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--lavender-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: color, color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '0.02em' }}>{init}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>{type}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--lavender-bg)' }}>
        <StatusPill active={active} />
      </td>
      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--lavender-bg)', fontSize: 13, color: 'var(--text-soft)', fontWeight: 400 }}>{created}</td>
      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--lavender-bg)' }}>
        <button onClick={e => { e.stopPropagation(); onConfigure(); }} style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 6,
          padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-mid)',
          cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 0.12s, border-color 0.12s, color 0.12s',
        }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--lavender-bg)'; el.style.borderColor = 'var(--lavender-dark)'; el.style.color = 'var(--plum)'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'none'; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-mid)'; }}
        >Configure</button>
      </td>
      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--lavender-bg)' }}>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)',
          padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.1s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-soft)')}
        >
          <Ic.X />
        </button>
      </td>
    </tr>
  );
};

export default Dashboard;