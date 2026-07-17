import api from './axios';

export const getReports = (params = {}) => api.get('/reports', { params }).then(r => r.data);
export const getReport = (id) => api.get(`/reports/${id}`).then(r => r.data);
export const createReport = (data) => api.post('/reports', data).then(r => r.data);
export const updateReport = (id, data) => api.put(`/reports/${id}`, data).then(r => r.data);
export const deleteReport = (id) => api.delete(`/reports/${id}`).then(r => r.data);
export const getReportData = (id) => api.get(`/reports/${id}/data`).then(r => r.data);
export const exportReport = (id, format) => api.get(`/reports/${id}/export`, { params: { format }, responseType: 'blob' }).then(r => r.data);
