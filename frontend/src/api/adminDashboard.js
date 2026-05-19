import api from './axios';

export const getSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const getTaskDistribution = async () => {
  const response = await api.get('/dashboard/task-distribution');
  return response.data;
};

export const getApprovalStats = async () => {
  const response = await api.get('/dashboard/approvals');
  return response.data;
};

export const getPerformance = async () => {
  const response = await api.get('/dashboard/performance');
  return response.data;
};

export const getAISummary = async () => {
  const response = await api.get('/dashboard/ai-summary');
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getAuditStats = async () => {
  const response = await api.get('/audit-logs/stats');
  return response.data;
};

export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

export const getDocuments = async (params = {}) => {
  const response = await api.get('/documents', { params });
  return response.data;
};

export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};
