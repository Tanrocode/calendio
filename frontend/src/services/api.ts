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

export const sendAgentMessage = async (businessId: number, message: string) => {
  const headers = await getAuthHeaders();
  const res = await axios.post('/agent/chat', { business_id: businessId, message }, { headers });
  return res.data;
};
