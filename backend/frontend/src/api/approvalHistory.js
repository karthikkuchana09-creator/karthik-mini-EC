import api from './axios';

export const getApprovalHistory = async (approvalId) => {
  const response = await api.get(`/approvals/${approvalId}/history`);
  return response.data;
};




