import api from './axios';

export const getSlaRules = (params) => api.get('/sla-rules', { params });
export const createSlaRule = (data) => api.post('/sla-rules', data);
export const updateSlaRule = (id, data) => api.put(`/sla-rules/${id}`, data);
export const deleteSlaRule = (id) => api.delete(`/sla-rules/${id}`);
export const toggleSlaRule = (id, active) => api.patch(`/sla-rules/${id}`, { is_active: active });

export const getSlaTrackingActive = () => api.get('/sla-tracking/active');
export const getSlaTrackingBreached = () => api.get('/sla-tracking/breached');
export const getSlaTrackingByModule = (moduleName) => api.get(`/sla-tracking/module/${moduleName}`);
export const getSlaTrackingRecord = (moduleName, recordId) => api.get(`/sla-tracking/record/${moduleName}/${recordId}`);
