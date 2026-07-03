import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import {
  createDemoCalendarEvent,
  deleteCalendarEvent,
  getCalendarStatus,
  listCalendarEvents,
  redirectToGoogleCalendarAuth,
  rescheduleCalendarEvent,
  type CalendarEventRow,
} from '../lib/calendarDemoApi';

/* ── DATE HELPERS ── */
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths    = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays      = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay      = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isPast       = (d: Date) => d.getTime() < new Date(new Date().toDateString()).getTime();
const fmtTime      = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDay       = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Build a 6-row × 7-col grid of dates for a month view (Sun–Sat), filling in
// leading/trailing days from adjacent months.
function buildMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const startDow = first.getDay(); // 0=Sun
  const gridStart = addDays(first, -startDow);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// Convert a local Date to the value string a <input type="datetime-local"> expects.
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInputValue(v: string): Date { return new Date(v); }

const AGENT_ACCENT = ['#8B5CF6', '#6D28D9', '#7C3AED', '#A855F7', '#5B21B6'];
function hashColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return AGENT_ACCENT[Math.abs(h) % AGENT_ACCENT.length];
}

function axiosErrorDetail(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof r === 'string') return r;
    if (r != null) return JSON.stringify(r);
  }
  return e instanceof Error ? e.message : 'Request failed';
}

/* ── ICONS ── */
const Ic = {
  Prev: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>,
  Next: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>,
  Plus: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  X: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Clock: () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>,
  Trash: () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/></svg>,
  Ext: () => <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>,
};

/* ── CONNECTION BANNER (only when disconnected) ── */
const ConnectBanner: React.FC<{ onConnect: () => void }> = ({ onConnect }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'linear-gradient(90deg, var(--plum-bg) 0%, white 60%)',
    border: '1px solid var(--lavender-dark)',
    borderRadius: 12, padding: '14px 18px',
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, background: 'var(--plum)', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Connect Google Calendar</div>
      <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>Your agent will book appointments straight into your calendar.</div>
    </div>
    <button onClick={onConnect} style={{
      background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8,
      padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
    }}>Connect →</button>
  </div>
);

/* ── EVENT CHIP (compact — inside a day cell) ── */
const EventChip: React.FC<{ ev: CalendarEventRow; onClick: () => void }> = ({ ev, onClick }) => {
  const color = hashColor(ev.id);
  const start = new Date(ev.start);
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={`${ev.summary} · ${fmtTime(start)}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: color + '18', color: color,
        borderLeft: `2.5px solid ${color}`,
        padding: '2px 6px', borderRadius: '0 5px 5px 0',
        fontSize: 10.5, fontWeight: 600,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        cursor: 'pointer',
      }}
    >
      <span style={{ opacity: 0.75, flexShrink: 0 }}>{fmtTime(start).replace(':00', '').toLowerCase().replace(' ', '')}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.summary || 'Event'}</span>
    </div>
  );
};

/* ── MONTH VIEW ── */
const MonthView: React.FC<{
  anchor: Date;
  events: CalendarEventRow[];
  onSelectDay: (d: Date) => void;
  onSelectEvent: (ev: CalendarEventRow) => void;
  selectedDay: Date | null;
}> = ({ anchor, events, onSelectDay, onSelectEvent, selectedDay }) => {
  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();
    for (const ev of events) {
      if (!ev.start) continue;
      const d = new Date(ev.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    // Sort each day's events chronologically
    for (const [, list] of map) list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return map;
  }, [events]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#FAFAFE', borderBottom: '1px solid var(--border)' }}>
        {dayNames.map(name => (
          <div key={name} style={{
            padding: '10px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--text-soft)', textTransform: 'uppercase',
          }}>{name}</div>
        ))}
      </div>

      {/* Grid — 6 rows */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', minHeight: 0 }}>
        {grid.map((d, i) => {
          const isToday    = sameDay(d, today);
          const isSelected = selectedDay && sameDay(d, selectedDay);
          const inMonth    = d.getMonth() === anchor.getMonth();
          const dayEvents  = eventsByDay.get(dayKey(d)) ?? [];
          const shown      = dayEvents.slice(0, 3);
          const overflow   = dayEvents.length - shown.length;

          return (
            <div
              key={i}
              onClick={() => onSelectDay(d)}
              style={{
                position: 'relative',
                borderRight: (i % 7) !== 6 ? '1px solid var(--lavender-bg)' : 'none',
                borderBottom: i < 35 ? '1px solid var(--lavender-bg)' : 'none',
                background: isSelected ? 'var(--plum-bg)' : isToday ? 'rgba(139,92,246,0.04)' : 'white',
                padding: '6px 6px 6px 8px',
                display: 'flex', flexDirection: 'column', gap: 3,
                cursor: 'pointer', minHeight: 0, minWidth: 0, overflow: 'hidden',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected && !isToday) e.currentTarget.style.background = '#FAFAFE'; }}
              onMouseLeave={e => { if (!isSelected && !isToday) e.currentTarget.style.background = 'white'; }}
            >
              {/* Date number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: !inMonth ? '#C9C4D6' : isToday ? 'white' : isPast(d) ? 'var(--text-soft)' : 'var(--text-dark)',
                  background: isToday ? 'var(--plum)' : 'transparent',
                  width: isToday ? 22 : 'auto', height: isToday ? 22 : 'auto',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: isToday ? 0 : '2px 6px',
                  marginLeft: isToday ? -2 : 0,
                }}>{d.getDate()}</div>
                {dayEvents.length > 0 && !isToday && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--plum-mid)', opacity: 0.8 }}>
                    {dayEvents.length}
                  </div>
                )}
              </div>

              {/* Event chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', flex: 1, minHeight: 0 }}>
                {shown.map(ev => (
                  <EventChip key={ev.id} ev={ev} onClick={() => onSelectEvent(ev)} />
                ))}
                {overflow > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--plum-mid)', padding: '1px 6px', cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); onSelectDay(d); }}
                  >
                    +{overflow} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── DAY DETAIL SIDEBAR (right column) ── */
const DayDetail: React.FC<{
  day: Date;
  events: CalendarEventRow[];
  onCreate: () => void;
  onSelectEvent: (ev: CalendarEventRow) => void;
}> = ({ day, events, onCreate, onSelectEvent }) => {
  const isToday = sameDay(day, new Date());
  const dayEvents = events
    .filter(ev => ev.start && sameDay(new Date(ev.start), day))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div style={{
      width: 300, flexShrink: 0,
      background: 'white', border: '1px solid var(--border)', borderRadius: 14,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {isToday ? 'Today' : day.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em', marginTop: 2 }}>
          {day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </div>
        <button onClick={onCreate} style={{
          marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          width: '100%', background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8,
          padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
        }}>
          <Ic.Plus /> Add event
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: dayEvents.length === 0 ? 0 : '8px 0' }}>
        {dayEvents.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', opacity: 0.35 }}>Nothing scheduled</div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>Free day — enjoy it or book something.</div>
          </div>
        ) : (
          dayEvents.map((ev, i) => {
            const color = hashColor(ev.id);
            const start = new Date(ev.start);
            const end   = new Date(ev.end);
            return (
              <div key={ev.id}
                onClick={() => onSelectEvent(ev)}
                style={{
                  padding: '10px 20px', display: 'flex', gap: 12, cursor: 'pointer',
                  borderBottom: i < dayEvents.length - 1 ? '1px solid var(--lavender-bg)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFE')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 4, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.summary || 'Event'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Ic.Clock />{fmtTime(start)} – {fmtTime(end)}
                  </div>
                  {ev.description_snippet && (
                    <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.description_snippet}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ── SHARED FORM STYLES ── */
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 };
const fieldInput: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text-dark)', outline: 'none', boxSizing: 'border-box' };

/* ── CREATE MODAL ── */
const CreateModal: React.FC<{
  title: string; desc: string; start: string; end: string;
  setTitle: (v: string) => void; setDesc: (v: string) => void;
  setStart: (v: string) => void; setEnd: (v: string) => void;
  onClose: () => void; onCreate: () => void; busy: boolean;
}> = ({ title, desc, start, end, setTitle, setDesc, setStart, setEnd, onClose, onCreate, busy }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,48,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24, backdropFilter: 'blur(6px)' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: '32px 32px 28px', width: '100%', maxWidth: 460, boxShadow: '0 24px 80px rgba(59,7,100,0.18)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>New event</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 3 }}>Adds to your Google Calendar.</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-soft)', cursor: 'pointer', padding: 4, display: 'flex' }}><Ic.X /></button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={fieldLabel}>Title</label>
        <input style={fieldInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" autoFocus />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={fieldLabel}>Starts</label>
          <input style={fieldInput} type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <label style={fieldLabel}>Ends</label>
          <input style={fieldInput} type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={fieldLabel}>Description</label>
        <textarea style={{ ...fieldInput, resize: 'vertical' }} rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional notes" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: 'transparent', color: 'var(--text-mid)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Cancel</button>
        <button onClick={onCreate} disabled={busy || !title.trim()} style={{ padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: 'var(--plum)', color: 'white', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy || !title.trim() ? 0.6 : 1, fontFamily: 'var(--font-ui)' }}>
          {busy ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </div>
  </div>
);

/* ── EVENT DETAIL MODAL (view + inline reschedule + delete) ── */
const EventModal: React.FC<{
  ev: CalendarEventRow;
  onClose: () => void;
  onSave: (start: string, end: string) => void;
  onDelete: () => void;
  busy: boolean;
}> = ({ ev, onClose, onSave, onDelete, busy }) => {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(toLocalInputValue(new Date(ev.start)));
  const [end, setEnd]     = useState(toLocalInputValue(new Date(ev.end)));

  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const color = hashColor(ev.id);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,48,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24, backdropFilter: 'blur(6px)' }}>
      <div onClick={ev2 => ev2.stopPropagation()} style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 80px rgba(59,7,100,0.18)', fontFamily: 'var(--font-ui)', overflow: 'hidden' }}>
        {/* accent header */}
        <div style={{ background: color + '18', borderBottom: `2px solid ${color}`, padding: '24px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Event</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
                {ev.summary || 'Untitled event'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-soft)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}><Ic.X /></button>
          </div>
        </div>

        <div style={{ padding: '20px 28px 24px' }}>
          {/* When */}
          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={fieldLabel}>Starts</label>
                <input style={fieldInput} type="datetime-local" value={start} onChange={e2 => setStart(e2.target.value)} />
              </div>
              <div>
                <label style={fieldLabel}>Ends</label>
                <input style={fieldInput} type="datetime-local" value={end} onChange={e2 => setEnd(e2.target.value)} />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>When</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
                <Ic.Clock />
                {fmtDay(s)} · {fmtTime(s)} – {fmtTime(e)}
              </div>
            </div>
          )}

          {ev.description_snippet && !editing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.5 }}>{ev.description_snippet}</div>
            </div>
          )}

          {ev.html_link && !editing && (
            <a href={ev.html_link} target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color: 'var(--plum-mid)',
              textDecoration: 'none', marginBottom: 4,
            }}>
              Open in Google Calendar <Ic.Ext />
            </a>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 22, borderTop: '1px solid var(--lavender-bg)', paddingTop: 18 }}>
            <button
              onClick={onDelete}
              disabled={busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, background: 'white', color: 'var(--red)', border: '1px solid #FECACA', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
            >
              <Ic.Trash /> Delete
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} style={{ padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, background: 'transparent', color: 'var(--text-mid)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Cancel</button>
                  <button onClick={() => onSave(fromLocalInputValue(start).toISOString(), fromLocalInputValue(end).toISOString())} disabled={busy}
                    style={{ padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 12, background: 'var(--plum)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Saving…' : 'Save times'}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} style={{ padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 12, background: 'var(--plum)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  Reschedule
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── MAIN PAGE ── */
const CalendarDemo: React.FC = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [anchor, setAnchor] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc]   = useState('');
  const [createStart, setCreateStart] = useState('');
  const [createEnd, setCreateEnd]     = useState('');
  const [openEvent, setOpenEvent] = useState<CalendarEventRow | null>(null);

  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  /* ── LOAD ── */
  const loadEvents = useCallback(async () => {
    // Fetch a wider window than just the current month so events peeking
    // into adjacent months (visible in the 6-row grid) still show up.
    const first = startOfMonth(anchor);
    const last  = endOfMonth(anchor);
    const from = addDays(first, -7).toISOString();
    const to   = addDays(last, 14).toISOString();
    try {
      const rows = await listCalendarEvents({ time_min: from, time_max: to, max_results: 50 });
      setEvents(rows);
      setError(null);
    } catch (e) {
      setError(axiosErrorDetail(e));
    }
  }, [anchor]);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getCalendarStatus();
      setConnected(s.connected);
    } catch { setConnected(false); }
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);
  useEffect(() => {
    if (connected) {
      setLoading(true);
      loadEvents().finally(() => setLoading(false));
    } else {
      setLoading(false);
      setEvents([]);
    }
  }, [connected, loadEvents]);

  /* ── ACTIONS ── */
  const openCreate = (day: Date) => {
    const start = new Date(day);
    const now = new Date();
    // Default: today → next hour; other days → 9 AM
    if (sameDay(day, now)) {
      start.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setCreateStart(toLocalInputValue(start));
    setCreateEnd(toLocalInputValue(end));
    setCreateTitle('');
    setCreateDesc('');
    setShowCreate(true);
  };

  const submitCreate = async () => {
    setBusy(true); setError(null);
    try {
      await createDemoCalendarEvent({
        title: createTitle,
        description: createDesc,
        start: fromLocalInputValue(createStart).toISOString(),
        end:   fromLocalInputValue(createEnd).toISOString(),
      });
      setShowCreate(false);
      await loadEvents();
    } catch (e) { setError(axiosErrorDetail(e)); }
    finally { setBusy(false); }
  };

  const submitReschedule = async (startIso: string, endIso: string) => {
    if (!openEvent) return;
    setBusy(true); setError(null);
    try {
      await rescheduleCalendarEvent(openEvent.id, startIso, endIso);
      setOpenEvent(null);
      await loadEvents();
    } catch (e) { setError(axiosErrorDetail(e)); }
    finally { setBusy(false); }
  };

  const submitDelete = async () => {
    if (!openEvent) return;
    if (!confirm(`Delete "${openEvent.summary || 'this event'}"?`)) return;
    setBusy(true); setError(null);
    try {
      await deleteCalendarEvent(openEvent.id);
      setOpenEvent(null);
      await loadEvents();
    } catch (e) { setError(axiosErrorDetail(e)); }
    finally { setBusy(false); }
  };

  const jumpToday = () => {
    const t = new Date();
    setAnchor(startOfMonth(t));
    setSelectedDay(t);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
              <em style={{ fontFamily: 'var(--font-brand)', fontStyle: 'italic', fontWeight: 600, color: 'var(--plum-mid)' }}>Calendar</em>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
              {connected === false ? 'Not connected' : connected === null ? 'Checking…' : `${events.length} event${events.length !== 1 ? 's' : ''} loaded`}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {connected && (
              <button
                onClick={() => openCreate(selectedDay || new Date())}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--plum-mid)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--plum)')}
              >
                <Ic.Plus /> New event
              </button>
            )}
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
          {connected === false && (
            <ConnectBanner onConnect={() => void redirectToGoogleCalendarAuth('/calendar-demo').catch(e => setError(axiosErrorDetail(e)))} />
          )}
          {error && (
            <div style={{ borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>{error}</div>
          )}

          {/* Calendar toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setAnchor(a => addMonths(a, -1))} style={iconBtn} onMouseEnter={hoverPlum} onMouseLeave={unhoverPlum}><Ic.Prev /></button>
              <button onClick={jumpToday} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: 'var(--lavender-bg)', color: 'var(--plum-mid)', border: '1px solid var(--lavender-dark)',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}>Today</button>
              <button onClick={() => setAnchor(a => addMonths(a, 1))} style={iconBtn} onMouseEnter={hoverPlum} onMouseLeave={unhoverPlum}><Ic.Next /></button>
              <div style={{ marginLeft: 14, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
                {monthLabel}
              </div>
            </div>
          </div>

          {/* Grid + day detail side panel */}
          <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 520 }}>
            {loading ? (
              <div style={{ flex: 1, background: 'white', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>Loading…</div>
              </div>
            ) : (
              <MonthView
                anchor={anchor}
                events={events}
                onSelectDay={setSelectedDay}
                onSelectEvent={setOpenEvent}
                selectedDay={selectedDay}
              />
            )}
            <DayDetail
              day={selectedDay}
              events={events}
              onCreate={() => openCreate(selectedDay)}
              onSelectEvent={setOpenEvent}
            />
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateModal
          title={createTitle} desc={createDesc} start={createStart} end={createEnd}
          setTitle={setCreateTitle} setDesc={setCreateDesc}
          setStart={setCreateStart} setEnd={setCreateEnd}
          onClose={() => setShowCreate(false)}
          onCreate={() => void submitCreate()}
          busy={busy}
        />
      )}
      {openEvent && (
        <EventModal
          ev={openEvent}
          onClose={() => setOpenEvent(null)}
          onSave={(s, e) => void submitReschedule(s, e)}
          onDelete={() => void submitDelete()}
          busy={busy}
        />
      )}
    </div>
  );
};

/* ── LITTLE STYLED BUTTON HELPERS ── */
const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 7, background: 'white', color: 'var(--text-mid)',
  border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
};
const hoverPlum: React.MouseEventHandler<HTMLButtonElement> = (e) => {
  e.currentTarget.style.background = 'var(--lavender-bg)';
  e.currentTarget.style.color = 'var(--plum)';
  e.currentTarget.style.borderColor = 'var(--lavender-dark)';
};
const unhoverPlum: React.MouseEventHandler<HTMLButtonElement> = (e) => {
  e.currentTarget.style.background = 'white';
  e.currentTarget.style.color = 'var(--text-mid)';
  e.currentTarget.style.borderColor = 'var(--border)';
};

export default CalendarDemo;
