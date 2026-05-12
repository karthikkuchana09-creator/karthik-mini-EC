import api from './axios';

export const getAISummary = async () => {
  const response = await api.get('/dashboard/ai-summary');
  return response.data;
};
