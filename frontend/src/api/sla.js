import api from './axios';

export const getSlaRules = async (params) => {
  const response = await api.get('/sla-rules', { params });
  return response.data;
};
export const createSlaRule = async (data) => {
  const response = await api.post('/sla-rules', data);
  return response.data;
};
export const updateSlaRule = async (id, data) => {
  const response = await api.put(`/sla-rules/${id}`, data);
  return response.data;
};
export const deleteSlaRule = async (id) => {
  const response = await api.delete(`/sla-rules/${id}`);
  return response.data;
};
export const toggleSlaRule = async (id, active) => {
  const response = await api.patch(`/sla-rules/${id}`, { is_active: active });
  return response.data;
};

export const getSlaTrackingActive = async () => {
  const response = await api.get('/sla-tracking/active');
  return response.data;
};
export const getSlaTrackingBreached = async () => {
  const response = await api.get('/sla-tracking/breached');
  return response.data;
};
export const getSlaTrackingByModule = async (moduleName) => {
  const response = await api.get(`/sla-tracking/module/${moduleName}`);
  return response.data;
};
export const getSlaTrackingRecord = async (moduleName, recordId) => {
  const response = await api.get(`/sla-tracking/record/${moduleName}/${recordId}`);
  return response.data;
};
