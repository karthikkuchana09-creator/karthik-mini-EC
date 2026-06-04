import api from './axios';

export const getApprovals = async () => {
  const response = await api.get('/approvals');
  return response.data;
};

export const createApproval = async (data) => {
  const response = await api.post('/approvals', data);
  return response.data;
};

export const getApprovalHistory = async (approvalId) => {
  const response = await api.get(`/approvals/${approvalId}/history`);
  return response.data;
};

export const updateApproval = async (approvalId, action, comment = '') => {
  const response = await api.patch(`/approvals/${approvalId}/action`, { action, comment });
  return response.data;
};

export const getEscalations = async () => {
  const response = await api.get('/approval-escalations');
  return response.data;
};

export const getPendingEscalations = async () => {
  const response = await api.get('/approval-escalations/pending');
  return response.data;
};

export const getEscalationsByApproval = async (approvalId) => {
  const response = await api.get(`/approval-escalations/approval/${approvalId}`);
  return response.data;
};

export const createEscalation = async (data) => {
  const response = await api.post('/approval-escalations', data);
  return response.data;
};

export const resolveEscalation = async (id) => {
  const response = await api.put(`/approval-escalations/${id}/resolve`);
  return response.data;
};

export const cancelEscalation = async (id) => {
  const response = await api.put(`/approval-escalations/${id}/cancel`);
  return response.data;
};

export const getDelegations = async () => {
  const response = await api.get('/approval-delegations');
  return response.data;
};

export const getMyDelegations = async () => {
  const response = await api.get('/approval-delegations/me');
  return response.data;
};

export const getActiveDelegations = async () => {
  const response = await api.get('/approval-delegations/active');
  return response.data;
};

export const createDelegation = async (data) => {
  const response = await api.post('/approval-delegations', data);
  return response.data;
};

export const cancelDelegation = async (id) => {
  const response = await api.put(`/approval-delegations/${id}/cancel`);
  return response.data;
};

export const toggleDelegation = async (id, active) => {
  const response = await api.patch(`/approval-delegations/${id}`, { is_active: active });
  return response.data;
};
