import axios from 'axios';

export const getMetrics = async (businessId: number) => {
  const res = await axios.get(`/dashboard/metrics/${businessId}`);
  return res.data;
};

export const sendAgentMessage = async (businessId: number, message: string) => {
  const res = await axios.post('/agent/chat', { business_id: businessId, message });
  return res.data;
};
