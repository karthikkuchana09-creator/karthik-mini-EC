import api from './axios';

export const getApprovals = async () => {
  const response = await api.get('/approvals');
  return response.data;
};

export const updateApproval = async (approvalId, action, comment = '') => {
  const response = await api.patch(`/approvals/${approvalId}/action`, { action, comment });
  return response.data;
};
