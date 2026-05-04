import api from './axios';

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const getTaskDistribution = async () => {
  const response = await api.get('/dashboard/task-distribution');
  return response.data;
};
