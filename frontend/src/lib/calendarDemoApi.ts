import axios from 'axios';
import { supabase } from './supabaseClient';

/** Build request config that includes BOTH the session cookie (for Google OAuth)
 *  AND the Supabase JWT (so the backend can restore tokens from DB when the cookie is gone). */
async function calendarConfig(extra?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return { withCredentials: true, headers, ...extra };
}

export type CalendarEventRow = {
  id: string;
  summary: string;
  start: string;
  end: string;
  html_link: string | null;
  description_snippet: string;
};

export async function getCalendarStatus(): Promise<{ connected: boolean }> {
  const cfg = await calendarConfig();
  const res = await axios.get<{ connected: boolean }>('/calendar-demo/status', cfg);
  return res.data;
}

/**
 * Starts Google OAuth. We GET `/auth/url` with the Supabase JWT so the backend
 * can tie the resulting Google tokens to this user in the database.
 */
export async function redirectToGoogleCalendarAuth(nextPath = '/calendar-demo'): Promise<void> {
  const cfg = await calendarConfig({ params: { next: nextPath } });
  const res = await axios.get<{ url: string }>('/auth/url', cfg);
  const url = res.data?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Backend did not return an OAuth URL.');
  }
  window.location.href = url;
}

export async function listCalendarEvents(params: {
  time_min: string;
  time_max: string;
  q?: string;
  max_results?: number;
}): Promise<CalendarEventRow[]> {
  const cfg = await calendarConfig({ params });
  const res = await axios.get<CalendarEventRow[]>('/calendar-demo/events', cfg);
  return res.data;
}

export async function deleteCalendarEvent(eventId: string): Promise<{ deleted: boolean; event_id: string }> {
  const cfg = await calendarConfig();
  const res = await axios.delete(`/calendar-demo/events/${encodeURIComponent(eventId)}`, cfg);
  return res.data;
}

export async function rescheduleCalendarEvent(
  eventId: string,
  new_start: string,
  new_end: string,
): Promise<{ google_event_id?: string; google_event_link?: string; start: string; end: string }> {
  const cfg = await calendarConfig();
  const res = await axios.patch(
    `/calendar-demo/events/${encodeURIComponent(eventId)}`,
    { new_start, new_end },
    cfg,
  );
  return res.data;
}

export async function checkFreeBusy(start: string, end: string): Promise<{ free: boolean }> {
  const cfg = await calendarConfig({ params: { start, end } });
  const res = await axios.get<{ free: boolean }>('/calendar-demo/freebusy', cfg);
  return res.data;
}

export async function getUpcomingEvents(params?: {
  hours_ahead?: number;
  max_results?: number;
}): Promise<CalendarEventRow[]> {
  const cfg = await calendarConfig({ params });
  const res = await axios.get<CalendarEventRow[]>('/calendar-demo/upcoming-events', cfg);
  return res.data;
}

export async function createDemoCalendarEvent(body: {
  title?: string;
  description?: string;
  start: string;
  end: string;
}): Promise<{ id?: string; html_link?: string; summary?: string }> {
  const cfg = await calendarConfig();
  const res = await axios.post('/calendar-demo/events', body, cfg);
  return res.data;
}
