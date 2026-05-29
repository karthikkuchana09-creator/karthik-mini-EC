import api from './axios';

export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

export const getAuditLogById = async (id) => {
  const response = await api.get(`/audit-logs/${id}`);
  return response.data;
};

export const getAuditLogsByModule = async (moduleName, params = {}) => {
  const response = await api.get(`/audit-logs/module/${moduleName}`, { params });
  return response.data;
};

export const getAuditLogsByUser = async (userId, params = {}) => {
  const response = await api.get(`/audit-logs/user/${userId}`, { params });
  return response.data;
};

export const getAuditLogsByDateRange = async (startDate, endDate, params = {}) => {
  const response = await api.get('/audit-logs/date-range', {
    params: { start_date: startDate, end_date: endDate, ...params },
  });
  return response.data;
};
