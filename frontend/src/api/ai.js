import api from './axios';

export const getAISummary = async () => {
  const response = await api.get('/dashboard/ai-summary');
  return response.data;
};

export const getHighPriorityTasks = async () => {
  const response = await api.get('/ai/high-priority-tasks');
  return response.data;
};
