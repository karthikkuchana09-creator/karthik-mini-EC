import api from './axios';

export const getTenants = async (params = {}) => {
  const response = await api.get('/tenants', { params });
  return response.data;
};

export const getTenant = async (tenantId) => {
  const response = await api.get(`/tenants/${tenantId}`);
  return response.data;
};

export const createTenant = async (data) => {
  const response = await api.post('/tenants', data);
  return response.data;
};

export const updateTenant = async (tenantId, data) => {
  const response = await api.put(`/tenants/${tenantId}`, data);
  return response.data;
};

export const suspendTenant = async (tenantId) => {
  const response = await api.patch(`/tenants/${tenantId}/suspend`);
  return response.data;
};

export const activateTenant = async (tenantId) => {
  const response = await api.patch(`/tenants/${tenantId}/activate`);
  return response.data;
};

export const onboardTenant = async (data) => {
  const response = await api.post('/tenants/onboard', data);
  return response.data;
};

export const createTenantAdmin = async (tenantId, data) => {
  const response = await api.post(`/tenants/${tenantId}/admin`, data);
  return response.data;
};

export const getOnboardingStatus = async (tenantId) => {
  const response = await api.get(`/tenants/${tenantId}/onboarding-status`);
  return response.data;
};

export const getCollaborationSettings = async (tenantId) => {
  const response = await api.get(`/tenants/${tenantId}/collaboration/settings`);
  return response.data;
};

export const updateCollaborationSettings = async (tenantId, data) => {
  const response = await api.put(`/tenants/${tenantId}/collaboration/settings`, data);
  return response.data;
};

export const getCollaborationUsage = async (tenantId) => {
  const response = await api.get(`/tenants/${tenantId}/collaboration/usage`);
  return response.data;
};

export const recalculateCollaborationUsage = async (tenantId) => {
  const response = await api.post(`/tenants/${tenantId}/collaboration/recalculate-usage`);
  return response.data;
};
