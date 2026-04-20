import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

/** Default list window: now → +7 days (ISO strings for the API). */
function defaultRange(): { time_min: string; time_max: string } {
  const a = new Date();
  const b = new Date(a.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { time_min: a.toISOString(), time_max: b.toISOString() };
}

const CalendarDemo: React.FC = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [{ time_min, time_max }, setRange] = useState(defaultRange);
  const [searchQ, setSearchQ] = useState('');
  const [events, setEvents] = useState<CalendarEventRow[]>([]);

  const [fbStart, setFbStart] = useState(() => defaultRange().time_min);
  const [fbEnd, setFbEnd] = useState(() => defaultRange().time_max);
  const [freeResult, setFreeResult] = useState<boolean | null>(null);

  const [createTitle, setCreateTitle] = useState('Calendio demo event');
  const [createDesc, setCreateDesc] = useState('Created from Calendar demo');
  const [createStart, setCreateStart] = useState('');
  const [createEnd, setCreateEnd] = useState('');

  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rsStart, setRsStart] = useState('');
  const [rsEnd, setRsEnd] = useState('');

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
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(axiosErrorDetail(e));
    } finally {
      setBusy(false);
    }
  };

  const reloadEventRows = async () => {
    const rows = await listCalendarEvents({
      time_min,
      time_max,
      q: searchQ.trim() || undefined,
      max_results: 25,
    });
    setEvents(rows);
    return rows.length;
  };

  const fetchEvents = () =>
    run(async () => {
      const n = await reloadEventRows();
      setMessage(`Loaded ${n} event(s).`);
    });

  const onDelete = (id: string) =>
    run(async () => {
      if (!window.confirm(`Delete event ${id}?`)) return;
      await deleteCalendarEvent(id);
      const n = await reloadEventRows();
      setMessage(`Deleted. ${n} event(s) in this window.`);
    });

  const onFreeBusy = () =>
    run(async () => {
      setFreeResult(null);
      const { free } = await checkFreeBusy(fbStart, fbEnd);
      setFreeResult(free);
      setMessage(free ? 'Slot is free.' : 'Something overlaps that window.');
    });

  const onCreate = () =>
    run(async () => {
      const out = await createDemoCalendarEvent({
        title: createTitle,
        description: createDesc,
        start: createStart,
        end: createEnd,
      });
      const n = await reloadEventRows();
      setMessage(`Created: ${out.summary ?? createTitle} (${out.id ?? 'no id'}). ${n} event(s) in window.`);
    });

  const onRescheduleSubmit = () =>
    run(async () => {
      if (!rescheduleId) return;
      await rescheduleCalendarEvent(rescheduleId, rsStart, rsEnd);
      setRescheduleId(null);
      const n = await reloadEventRows();
      setMessage(`Rescheduled. ${n} event(s) in this window.`);
    });

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Google Calendar demo</h1>
        <div className="flex gap-4 text-sm font-medium">
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-800">
            Dashboard
          </Link>
          <Link to="/voice" className="text-blue-600 hover:text-blue-800">
            Voice
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <p className="text-sm text-slate-600 leading-relaxed">
          This page calls the same Calendar logic as the scheduling agent (list / search / delete / reschedule / free-busy).
          You must be logged into the app, then connect Google — the session cookie is sent on these requests through the
          Vite proxy. If connection never turns green, use the same host for the UI as for the API (for example{' '}
          <code className="rounded bg-slate-200 px-1">http://127.0.0.1:3000</code>).
        </p>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Connection</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {connected === null ? 'Checking…' : connected ? 'Google Calendar connected' : 'Not connected'}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void redirectToGoogleCalendarAuth('/calendar-demo').catch((e) =>
                  setError(axiosErrorDetail(e)),
                );
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Connect Google Calendar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshStatus()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh status
            </button>
          </div>
        </section>

        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{message}</p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">{error}</p>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">List &amp; search events</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              time_min (ISO)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={time_min}
                onChange={(e) => setRange((r) => ({ ...r, time_min: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              time_max (ISO)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={time_max}
                onChange={(e) => setRange((r) => ({ ...r, time_max: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search text (optional — phone, name, etc.; passed to Google&apos;s <code className="font-mono">q</code>)
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="+14155552671"
            />
          </label>
          <button
            type="button"
            disabled={busy || !connected}
            onClick={() => void fetchEvents()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            Fetch events
          </button>

          {events.length > 0 && (
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Summary</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-medium">{ev.summary}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{ev.start}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{ev.end}</td>
                      <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                        {ev.html_link && (
                          <a href={ev.html_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            Open
                          </a>
                        )}
                        <button
                          type="button"
                          className="text-amber-700 hover:underline"
                          onClick={() => {
                            setRescheduleId(ev.id);
                            setRsStart(ev.start);
                            setRsEnd(ev.end);
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => void onDelete(ev.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Free / busy</h2>
          <p className="text-xs text-slate-500">Same as agent tool <code className="font-mono">check_availability</code>.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase text-slate-500">
              start (ISO)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={fbStart}
                onChange={(e) => setFbStart(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              end (ISO)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={fbEnd}
                onChange={(e) => setFbEnd(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !connected}
            onClick={() => void onFreeBusy()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            Check window
          </button>
          {freeResult !== null && (
            <p className="text-sm font-medium">{freeResult ? 'Free for the whole window.' : 'Busy (overlap exists).'}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Create event (Google only)</h2>
          <p className="text-xs text-slate-500">
            Inserts on your primary calendar only — does not write to Supabase (unlike agent <code className="font-mono">create_appointment</code>).
          </p>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="Description"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase text-slate-500">
              start (ISO)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              end (ISO)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={createEnd}
                onChange={(e) => setCreateEnd(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !connected}
            onClick={() => void onCreate()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create demo event
          </button>
        </section>

        {rescheduleId && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Reschedule event</h2>
            <p className="text-xs font-mono text-slate-600">id: {rescheduleId}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                new_start (ISO)
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono bg-white"
                  value={rsStart}
                  onChange={(e) => setRsStart(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                new_end (ISO)
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono bg-white"
                  value={rsEnd}
                  onChange={(e) => setRsEnd(e.target.value)}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRescheduleSubmit()}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                Save new times
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-800"
                onClick={() => setRescheduleId(null)}
              >
                Cancel
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

function axiosErrorDetail(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof r === 'string') return r;
    if (r != null) return JSON.stringify(r);
  }
  return e instanceof Error ? e.message : 'Request failed';
}

export default CalendarDemo;
