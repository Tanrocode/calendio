import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

async function getAuthHeaders(): Promise<{ Authorization: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  // Refresh if token expires within the next 60 seconds
  if (session.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (refreshed) return { Authorization: `Bearer ${refreshed.access_token}` };
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export const getMetrics = async () => {
  const headers = await getAuthHeaders();
  const res = await axios.get('/dashboard/metrics', { headers });
  return res.data;
};

export const sendAgentMessage = async (message: string) => {
  const headers = await getAuthHeaders();
  const res = await axios.post('/agent/chat', { message }, { headers });
  return res.data;
};

export type AgentConfig = {
  id: number;
  name: string;
  services: string | null;
  business_hours: string | null;
  agent_instructions: string | null;
  context: string | null;
  is_active: boolean;
  created_at: string | null;
};

let agentsCache: AgentConfig[] | null = null;

export const getAgent = async (id: number): Promise<AgentConfig> => {
  if (agentsCache) {
    const cached = agentsCache.find(a => a.id === id);
    if (cached) return cached;
  }
  const headers = await getAuthHeaders();
  const res = await axios.get(`/agents/${id}`, { headers });
  return res.data;
};

export const getAgents = async (): Promise<AgentConfig[]> => {
  if (agentsCache) return agentsCache;
  const headers = await getAuthHeaders();
  const res = await axios.get('/agents', { headers });
  agentsCache = res.data;
  return res.data;
};

export const createAgent = async (data: {
  name: string;
  services?: string;
  business_hours?: string;
  agent_instructions?: string;
}): Promise<AgentConfig> => {
  const headers = await getAuthHeaders();
  const res = await axios.post('/agents', data, { headers });
  agentsCache = null; // invalidate cache
  return res.data;
};

export const chatWithAgent = async (
  agentId: number,
  message: string,
  history: { role: string; content: string }[] = [],
): Promise<{ reply: string }> => {
  const headers = await getAuthHeaders();
  const res = await axios.post(`/agents/${agentId}/chat`, { message, history }, { headers, withCredentials: true });
  return res.data;
};

export const deleteAgent = async (id: number): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.delete(`/agents/${id}`, { headers });
  agentsCache = null; // invalidate cache
};

// Update editable fields on an existing agent (name, services, hours, instructions, active toggle)
// ── VOICE: STT ──────────────────────────────────────────────────────────────
// Send a raw audio Blob (webm from MediaRecorder) to the backend, which runs
// OpenAI Whisper and returns the transcribed text string.
export const transcribeAudio = async (agentId: number, audioBlob: Blob): Promise<string> => {
  const headers = await getAuthHeaders();
  const form = new FormData();
  form.append('file', audioBlob, 'recording.webm');
  const res = await axios.post(`/agents/${agentId}/transcribe`, form, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
  });
  return res.data.text as string;
};

// ── VOICE: TTS ──────────────────────────────────────────────────────────────
// Send the agent's text reply to the backend TTS endpoint and get back an
// audio Blob (mp3).  Caller creates a blob URL and plays it with <audio>.
export const speakText = async (agentId: number, text: string, voice = 'coral'): Promise<Blob> => {
  const headers = await getAuthHeaders();
  const res = await axios.post(
    `/agents/${agentId}/speak`,
    { text, voice },
    { headers, responseType: 'blob' },
  );
  return res.data as Blob;
};

export const uploadAgentContextPdf = async (
  agentId: number,
  file: File,
): Promise<{ extracted_chars: number; pages: number; context: string }> => {
  const headers = await getAuthHeaders();
  const form = new FormData();
  form.append('file', file);
  const res = await axios.post(`/agents/${agentId}/upload-context`, form, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateAgent = async (
  id: number,
  data: {
    name?: string;
    services?: string;
    business_hours?: string;
    agent_instructions?: string;
    context?: string;
    is_active?: boolean;
  }
): Promise<AgentConfig> => {
  const headers = await getAuthHeaders();
  const res = await axios.patch(`/agents/${id}`, data, { headers });
  agentsCache = null; // invalidate so dashboard re-fetches fresh data
  return res.data;
};

export type ConversationRow = {
  id: number;
  agent_id: number;
  user_id: number;
  summary: string;
  intent: string | null;
  outcome: string | null;
  started_at: string;
  ended_at: string;
};

// Fetch recent chat conversations for the dashboard Recent Activity section
export const getRecentActivity = async (): Promise<ConversationRow[]> => {
  const headers = await getAuthHeaders();
  const res = await axios.get('/dashboard/recent-activity', { headers });
  return res.data.conversations ?? [];
};

// Save a complete call session transcript when the user ends the conversation
export const saveConversation = async (
  agentId: number,
  messages: { role: string; content: string }[],
  elapsedSeconds: number = 0,
): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.post(`/agents/${agentId}/conversations`, { messages, elapsed_seconds: elapsedSeconds }, { headers });
};

// ── VOICE: REALTIME SESSION TOKEN ───────────────────────────────────────────
// Fetches a short-lived ephemeral token from the backend so the browser can
// open a WebSocket to the OpenAI Realtime API without exposing the API key.
export const getRealtimeToken = async (
  agentId: number,
): Promise<{ client_secret: { value: string; expires_at: number } }> => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`/agents/${agentId}/realtime-token`, { headers });
  return res.data;
};

export const getCalendarStatus = async (): Promise<{ connected: boolean }> => {
  const res = await axios.get('/calendar-demo/status', { withCredentials: true });
  return res.data;
};

export const getCalendarAuthUrl = async (next: string): Promise<{ url: string }> => {
  // Send both the session cookie (needed for OAuth state) AND the Supabase JWT
  // so the backend can persist the resulting Google tokens to the database.
  const headers = await getAuthHeaders();
  const res = await axios.get(`/auth/url?next=${encodeURIComponent(next)}`, {
    withCredentials: true,
    headers,
  });
  return res.data;
};
