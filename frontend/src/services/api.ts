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

export const getCalendarStatus = async (): Promise<{ connected: boolean }> => {
  const res = await axios.get('/calendar-demo/status', { withCredentials: true });
  return res.data;
};

export const getCalendarAuthUrl = async (next: string): Promise<{ url: string }> => {
  const res = await axios.get(`/auth/url?next=${encodeURIComponent(next)}`, { withCredentials: true });
  return res.data;
};
