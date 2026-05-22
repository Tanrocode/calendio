import React, { useCallback, useEffect, useState } from 'react';
import '../styles/CalendarDemo.css';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  checkFreeBusy,
  createDemoCalendarEvent,
  deleteCalendarEvent,
  getCalendarStatus,
  listCalendarEvents,
  redirectToGoogleCalendarAuth,
  rescheduleCalendarEvent,
  type CalendarEventRow,
} from '../lib/calendarDemoApi';
import Sidebar from '../components/Sidebar';

/* ─── date-fns localizer ─── */
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

/* ─── helpers ─── */
function defaultRange() {
  const a = new Date();
  const b = new Date(a.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { time_min: a.toISOString(), time_max: b.toISOString() };
}

function axiosErrorDetail(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof r === 'string') return r;
    if (r != null) return JSON.stringify(r);
  }
  return e instanceof Error ? e.message : 'Request failed';
}

/* ─── types ─── */
interface RbcEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: CalendarEventRow;
}

/* ─── CSS injected once ─── */
const CAL_CSS = `
.rbc-calendar { font-family: var(--font-ui, 'Inter', system-ui, sans-serif); }

/* toolbar */
.rbc-toolbar {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  margin: 0;
  border-bottom: 1px solid var(--border, #E4E0ED);
  background: white;
  flex-wrap: wrap;
  gap: 8px;
}
.rbc-toolbar-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-dark, #1C0A30);
  letter-spacing: -0.02em;
  flex: 1;
  text-align: left;
}
.rbc-btn-group { display: flex; gap: 4px; }
.rbc-btn-group button,
.rbc-toolbar button {
  border-radius: 7px !important;
  border: 1px solid var(--border, #E4E0ED) !important;
  background: white !important;
  padding: 5px 12px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--text-mid, #4A3B6A) !important;
  font-family: var(--font-ui, 'Inter', system-ui, sans-serif) !important;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.rbc-btn-group button:hover:not(.rbc-active),
.rbc-toolbar button:hover:not(.rbc-active) {
  background: var(--lavender-bg, #F9F7FD) !important;
  color: var(--plum, #6B3FA0) !important;
}
.rbc-btn-group button.rbc-active,
.rbc-toolbar button.rbc-active {
  background: var(--plum, #6B3FA0) !important;
  color: white !important;
  border-color: var(--plum, #6B3FA0) !important;
}

/* header row */
.rbc-month-header { border-bottom: 1px solid var(--border, #E4E0ED); }
.rbc-header {
  background: var(--lavender-bg, #F9F7FD);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-soft, #8B7BA8);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 4px;
  border-bottom: none;
}
.rbc-header + .rbc-header { border-left: 1px solid var(--border, #E4E0ED); }

/* grid */
.rbc-month-view {
  border: none;
  border-radius: 0;
  flex: 1;
}
.rbc-time-view { border: none; }
.rbc-month-row { border-top: 1px solid var(--border, #E4E0ED); }
.rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--border, #E4E0ED); }
.rbc-off-range-bg { background: var(--lavender-bg, #F9F7FD); opacity: 0.6; }
.rbc-today { background: rgba(107, 63, 160, 0.05) !important; }

/* date numbers */
.rbc-date-cell {
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-mid, #4A3B6A);
  text-align: right;
}
.rbc-date-cell.rbc-now > a,
.rbc-date-cell.rbc-now > button {
  background: var(--plum, #6B3FA0);
  color: white;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.rbc-date-cell > a { color: inherit; text-decoration: none; }
.rbc-off-range > a { opacity: 0.35; }

/* events */
.rbc-event {
  background: var(--plum-bg, #F5F0FC) !important;
  color: var(--plum-mid, #8B5CC8) !important;
  border: none !important;
  border-left: 2.5px solid var(--plum-mid, #8B5CC8) !important;
  border-radius: 0 6px 6px 0 !important;
  padding: 2px 6px !important;
  font-size: 10.5px !important;
  font-weight: 600 !important;
  outline: none;
}
.rbc-event:focus { outline: 2px solid var(--plum-xlight, #C4A8E8); outline-offset: 1px; }
.rbc-event.rbc-selected {
  background: var(--plum-xlight, #C4A8E8) !important;
  color: var(--plum, #6B3FA0) !important;
}
.rbc-show-more {
  color: var(--plum-mid, #8B5CC8);
  font-size: 10.5px;
  font-weight: 600;
  background: none;
  padding: 2px 8px;
}

/* time grid */
.rbc-time-header-content { border-left: 1px solid var(--border, #E4E0ED); }
.rbc-timeslot-group { border-bottom: 1px solid var(--border, #E4E0ED); min-height: 48px; }
.rbc-time-slot { font-size: 11px; color: var(--text-soft, #8B7BA8); }
.rbc-current-time-indicator { background: var(--plum, #6B3FA0); height: 2px; }
`;

/* ─── tiny icon helpers ─── */
const IconCalendar = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconPlus = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
  </svg>
);

/* ─── shared style tokens ─── */
const S = {
  page: { display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg, #F4F2F9)' } as React.CSSProperties,
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', flexShrink: 0 } as React.CSSProperties,
  pageTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' } as React.CSSProperties,
  pageSub: { fontSize: 12, color: 'var(--text-soft)', marginTop: 2 } as React.CSSProperties,
  content: { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 } as React.CSSProperties,

  /* connection bar */
  connBar: { display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', flexShrink: 0 } as React.CSSProperties,
  connLabel: { fontSize: 13, color: 'var(--text-soft)', marginRight: 'auto' } as React.CSSProperties,

  /* calendar shell */
  calShell: { background: 'white', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 480 } as React.CSSProperties,

  /* messages */
  msgOk: { borderRadius: 10, border: '1px solid #BBF7D0', background: '#F0FDF4', padding: '9px 14px', fontSize: 13, color: '#166534', flexShrink: 0 } as React.CSSProperties,
  msgErr: { borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', padding: '9px 14px', fontSize: 13, color: '#991B1B', flexShrink: 0 } as React.CSSProperties,

  /* sidebar panel for tools */
  toolPanel: { background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', flexShrink: 0 } as React.CSSProperties,
  panelTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 12 } as React.CSSProperties,
  fieldLabel: { display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } as React.CSSProperties,
  input: { width: '100%', padding: '7px 10px', background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 7, fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--text-dark)', outline: 'none' } as React.CSSProperties,

  /* buttons */
  btnPlum: { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--plum)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnOutline: { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'white', color: 'var(--text-mid)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-ui)' } as React.CSSProperties,
  btnDanger: { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'white', color: 'var(--red)', border: '1px solid #FECACA', cursor: 'pointer', fontFamily: 'var(--font-ui)' } as React.CSSProperties,
  btnAmber: { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', cursor: 'pointer', fontFamily: 'var(--font-ui)' } as React.CSSProperties,
};

/* ─── connection pill ─── */
const ConnPill: React.FC<{ connected: boolean | null }> = ({ connected }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
    background: connected ? 'var(--green-light, #DCFCE7)' : '#F3F4F6',
    color: connected ? 'var(--green, #16A34A)' : '#6B7280',
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--green)' : '#9CA3AF' }} />
    {connected === null ? 'Checking…' : connected ? 'Connected' : 'Not connected'}
  </span>
);

/* ─── reschedule modal ─── */
const RescheduleModal: React.FC<{
  eventId: string;
  rsStart: string;
  rsEnd: string;
  setRsStart: (v: string) => void;
  setRsEnd: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}> = ({ eventId, rsStart, rsEnd, setRsStart, setRsEnd, onSave, onCancel, busy }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,48,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24, backdropFilter: 'blur(4px)' }}>
    <div style={{ background: 'white', borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: 420, boxShadow: '0 16px 64px rgba(59,7,100,0.16)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>Reschedule event</div>
      <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-soft)', marginBottom: 20 }}>{eventId}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={S.fieldLabel}>New start</label>
          <input style={S.input} value={rsStart} onChange={e => setRsStart(e.target.value)} />
        </div>
        <div>
          <label style={S.fieldLabel}>New end</label>
          <input style={S.input} value={rsEnd} onChange={e => setRsEnd(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={S.btnOutline} onClick={onCancel}>Cancel</button>
        <button style={S.btnAmber} disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : 'Save new times'}
        </button>
      </div>
    </div>
  </div>
);

/* ─── create event modal ─── */
const CreateModal: React.FC<{
  title: string; desc: string; start: string; end: string;
  setTitle: (v: string) => void; setDesc: (v: string) => void;
  setStart: (v: string) => void; setEnd: (v: string) => void;
  onClose: () => void; onCreate: () => void; busy: boolean; connected: boolean | null;
}> = ({ title, desc, start, end, setTitle, setDesc, setStart, setEnd, onClose, onCreate, busy, connected }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,48,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24, backdropFilter: 'blur(4px)' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 16px 64px rgba(59,7,100,0.16)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 2 }}>New event</div>
      <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 20 }}>Adds directly to your Google Calendar</div>

      <div style={{ marginBottom: 12 }}>
        <label style={S.fieldLabel}>Title</label>
        <input style={S.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={S.fieldLabel}>Description</label>
        <textarea
          style={{ ...S.input, resize: 'vertical' } as React.CSSProperties}
          rows={2}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Optional description"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={S.fieldLabel}>Start (ISO)</label>
          <input style={{ ...S.input, fontFamily: 'monospace' }} value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <label style={S.fieldLabel}>End (ISO)</label>
          <input style={{ ...S.input, fontFamily: 'monospace' }} value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={S.btnOutline} onClick={onClose}>Cancel</button>
        <button style={S.btnPlum} disabled={busy || !connected} onClick={onCreate}>
          {busy ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </div>
  </div>
);

/* ─── main component ─── */
const CalendarDemo: React.FC = () => {
  /* inject CSS once */
  useEffect(() => {
    if (document.getElementById('cal-theme-css')) return;
    const tag = document.createElement('style');
    tag.id = 'cal-theme-css';
    tag.textContent = CAL_CSS;
    document.head.appendChild(tag);
    return () => { tag.remove(); };
  }, []);

  /* state */
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [{ time_min, time_max }, setRange] = useState(defaultRange);
  const [searchQ, setSearchQ] = useState('');
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [rbcEvents, setRbcEvents] = useState<RbcEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<string>(Views.MONTH);

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('Calendio demo event');
  const [createDesc, setCreateDesc] = useState('Created from Calendar demo');
  const [createStart, setCreateStart] = useState('');
  const [createEnd, setCreateEnd] = useState('');

  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rsStart, setRsStart] = useState('');
  const [rsEnd, setRsEnd] = useState('');

  const [fbStart, setFbStart] = useState(() => defaultRange().time_min);
  const [fbEnd, setFbEnd] = useState(() => defaultRange().time_max);
  const [freeResult, setFreeResult] = useState<boolean | null>(null);

  const [showFreeBusy, setShowFreeBusy] = useState(false);

  /* convert api rows → rbc events */
  const toRbcEvents = (rows: CalendarEventRow[]): RbcEvent[] =>
    rows
      .filter(ev => ev.start && ev.end)
      .map(ev => ({
        id: ev.id,
        title: ev.summary || '(no title)',
        start: new Date(ev.start),
        end: new Date(ev.end),
        resource: ev,
      }));

  const refreshStatus = useCallback(async () => {
    setError(null);
    try {
      const s = await getCalendarStatus();
      setConnected(s.connected);
    } catch (e) {
      setConnected(false);
      setError(axiosErrorDetail(e));
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const r = defaultRange();
    setCreateStart(r.time_min);
    setCreateEnd(r.time_max);
  }, [refreshStatus]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await fn(); } catch (e) { setError(axiosErrorDetail(e)); } finally { setBusy(false); }
  };

  const reloadEvents = async () => {
    const rows = await listCalendarEvents({ time_min, time_max, q: searchQ.trim() || undefined, max_results: 50 });
    setEvents(rows);
    setRbcEvents(toRbcEvents(rows));
    return rows.length;
  };

  const fetchEvents = () =>
    run(async () => {
      const n = await reloadEvents();
      setMessage(`Loaded ${n} event(s).`);
    });

  /* auto-load on mount if connected */
  useEffect(() => {
    if (connected) { void fetchEvents(); }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDelete = (id: string) =>
    run(async () => {
      if (!window.confirm(`Delete event ${id}?`)) return;
      await deleteCalendarEvent(id);
      const n = await reloadEvents();
      setMessage(`Deleted. ${n} event(s) remaining.`);
    });

  const onFreeBusy = () =>
    run(async () => {
      setFreeResult(null);
      const { free } = await checkFreeBusy(fbStart, fbEnd);
      setFreeResult(free);
      setMessage(free ? 'Slot is free.' : 'Busy — overlap exists.');
    });

  const onCreate = () =>
    run(async () => {
      const out = await createDemoCalendarEvent({ title: createTitle, description: createDesc, start: createStart, end: createEnd });
      const n = await reloadEvents();
      setShowCreate(false);
      setMessage(`Created: ${out.summary ?? createTitle}. ${n} event(s) in window.`);
    });

  const onRescheduleSubmit = () =>
    run(async () => {
      if (!rescheduleId) return;
      await rescheduleCalendarEvent(rescheduleId, rsStart, rsEnd);
      setRescheduleId(null);
      const n = await reloadEvents();
      setMessage(`Rescheduled. ${n} event(s) in this window.`);
    });

  /* rbc slot select → pre-fill create modal */
  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setCreateStart(start.toISOString());
    setCreateEnd(end.toISOString());
    setShowCreate(true);
  };

  /* rbc event click → open reschedule */
  const onSelectEvent = (event: RbcEvent) => {
    setRescheduleId(event.id);
    setRsStart(event.start.toISOString());
    setRsEnd(event.end.toISOString());
  };

  /* custom event styling */
  const eventStyleGetter = () => ({
    style: {
      background: 'var(--plum-bg, #F5F0FC)',
      color: 'var(--plum-mid, #8B5CC8)',
      border: 'none',
      borderLeft: '2.5px solid var(--plum-mid, #8B5CC8)',
      borderRadius: '0 6px 6px 0',
      padding: '2px 6px',
      fontSize: '10.5px',
      fontWeight: 600,
    },
  });

  return (
    <div style={S.page}>
      <Sidebar />

      <div style={S.main}>
        {/* Page header */}
        <div style={S.header}>
          <div>
            <div style={S.pageTitle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconCalendar />
                Calendar
              </span>
            </div>
            <div style={S.pageSub}>Manage your schedule and appointments</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={S.btnOutline}
              onClick={() => setShowFreeBusy(v => !v)}
            >
              Free / busy
            </button>
            <button
              style={S.btnPlum}
              disabled={!connected}
              onClick={() => setShowCreate(true)}
            >
              <IconPlus /> New event
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={S.content}>

          {/* Connection bar */}
          <div style={S.connBar}>
            <span style={S.connLabel}>Google Calendar</span>
            <ConnPill connected={connected} />
            <button
              style={S.btnOutline}
              disabled={busy}
              onClick={() => void redirectToGoogleCalendarAuth('/calendar-demo').catch(e => setError(axiosErrorDetail(e)))}
            >
              Connect
            </button>
            <button style={S.btnOutline} disabled={busy} onClick={() => void refreshStatus()}>
              Refresh
            </button>
          </div>

          {/* Toast messages */}
          {message && <div style={S.msgOk}>{message}</div>}
          {error   && <div style={S.msgErr}>{error}</div>}

          {/* Free / busy panel (collapsible) */}
          {showFreeBusy && (
            <div style={S.toolPanel}>
              <div style={S.panelTitle}>Free / busy check</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.fieldLabel}>Start (ISO)</label>
                  <input style={{ ...S.input, fontFamily: 'monospace' }} value={fbStart} onChange={e => setFbStart(e.target.value)} />
                </div>
                <div>
                  <label style={S.fieldLabel}>End (ISO)</label>
                  <input style={{ ...S.input, fontFamily: 'monospace' }} value={fbEnd} onChange={e => setFbEnd(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button style={S.btnOutline} disabled={busy || !connected} onClick={() => void onFreeBusy()}>
                  Check window
                </button>
                {freeResult !== null && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: freeResult ? 'var(--green)' : 'var(--red)' }}>
                    {freeResult ? '✓ Free' : '✗ Busy'}
                  </span>
                )}
              </div>
            </div>
          )}


          {/* Calendar */}
          <div style={S.calShell}>
            <Calendar
              localizer={localizer}
              events={rbcEvents}
              date={currentDate}
              view={currentView as any}
              onNavigate={setCurrentDate}
              onView={v => setCurrentView(v)}
              selectable={!!connected}
              onSelectSlot={onSelectSlot}
              onSelectEvent={onSelectEvent}
              eventPropGetter={eventStyleGetter}
              style={{ flex: 1 }}
              popup
              tooltipAccessor={e => e.title}
            />
          </div>

          {/* Event list (compact, below calendar) */}
          {events.length > 0 && (
            <div style={{ ...S.toolPanel, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Events in window</span>
                <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--lavender-bg)' }}>
                      {['Summary', 'Start', 'End', ''].map((h, i) => (
                        <th key={i} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid var(--lavender-bg)' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--text-dark)' }}>{ev.summary}</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: 'var(--text-soft)', fontSize: 11 }}>{ev.start}</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: 'var(--text-soft)', fontSize: 11 }}>{ev.end}</td>
                        <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {ev.html_link && (
                              <a href={ev.html_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 600, color: 'var(--plum-mid)', textDecoration: 'none' }}>Open ↗</a>
                            )}
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#92400E', fontFamily: 'var(--font-ui)', padding: 0 }}
                              onClick={() => { setRescheduleId(ev.id); setRsStart(ev.start); setRsEnd(ev.end); }}
                            >Reschedule</button>
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--red)', fontFamily: 'var(--font-ui)', padding: 0 }}
                              onClick={() => void onDelete(ev.id)}
                            >Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateModal
          title={createTitle} desc={createDesc} start={createStart} end={createEnd}
          setTitle={setCreateTitle} setDesc={setCreateDesc}
          setStart={setCreateStart} setEnd={setCreateEnd}
          onClose={() => setShowCreate(false)} onCreate={() => void onCreate()}
          busy={busy} connected={connected}
        />
      )}
      {rescheduleId && (
        <RescheduleModal
          eventId={rescheduleId}
          rsStart={rsStart} rsEnd={rsEnd}
          setRsStart={setRsStart} setRsEnd={setRsEnd}
          onSave={() => void onRescheduleSubmit()}
          onCancel={() => setRescheduleId(null)}
          busy={busy}
        />
      )}
    </div>
  );
};

export default CalendarDemo;