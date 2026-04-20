import axios from 'axios';

/** Google OAuth + calendar-demo routes use the FastAPI session cookie (not Supabase JWT). */
const creds = { withCredentials: true } as const;

export type CalendarEventRow = {
  id: string;
  summary: string;
  start: string;
  end: string;
  html_link: string | null;
  description_snippet: string;
};

export async function getCalendarStatus(): Promise<{ connected: boolean }> {
  const res = await axios.get<{ connected: boolean }>('/calendar-demo/status', creds);
  return res.data;
}

/**
 * Starts Google OAuth. We must GET `/auth/url` with XHR (JSON body), then navigate to `data.url`.
 * A full-page visit to `/auth/url` would only show the JSON — it does not follow the Google link for you.
 */
export async function redirectToGoogleCalendarAuth(nextPath = '/calendar-demo'): Promise<void> {
  const res = await axios.get<{ url: string }>('/auth/url', {
    ...creds,
    params: { next: nextPath },
  });
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
  const res = await axios.get<CalendarEventRow[]>('/calendar-demo/events', {
    ...creds,
    params,
  });
  return res.data;
}

export async function deleteCalendarEvent(eventId: string): Promise<{ deleted: boolean; event_id: string }> {
  const res = await axios.delete(`/calendar-demo/events/${encodeURIComponent(eventId)}`, creds);
  return res.data;
}

export async function rescheduleCalendarEvent(
  eventId: string,
  new_start: string,
  new_end: string,
): Promise<{ google_event_id?: string; google_event_link?: string; start: string; end: string }> {
  const res = await axios.patch(
    `/calendar-demo/events/${encodeURIComponent(eventId)}`,
    { new_start, new_end },
    creds,
  );
  return res.data;
}

export async function checkFreeBusy(start: string, end: string): Promise<{ free: boolean }> {
  const res = await axios.get<{ free: boolean }>('/calendar-demo/freebusy', {
    ...creds,
    params: { start, end },
  });
  return res.data;
}

export async function createDemoCalendarEvent(body: {
  title?: string;
  description?: string;
  start: string;
  end: string;
}): Promise<{ id?: string; html_link?: string; summary?: string }> {
  const res = await axios.post('/calendar-demo/events', body, creds);
  return res.data;
}
