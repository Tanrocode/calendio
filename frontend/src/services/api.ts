import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

async function getAuthHeaders(): Promise<{ Authorization: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
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

export const getAgents = async (): Promise<AgentConfig[]> => {
  const headers = await getAuthHeaders();
  const res = await axios.get('/agents', { headers });
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
  return res.data;
};

export const deleteAgent = async (id: number): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.delete(`/agents/${id}`, { headers });
};
