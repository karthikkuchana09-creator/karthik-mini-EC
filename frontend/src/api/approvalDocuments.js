import api from './axios';

export const getApprovalDocuments = async (approvalId, params = {}) => {
  const response = await api.get(`/approvals/${approvalId}/documents`, { params });
  return response.data;
};

export const uploadApprovalDocument = async (approvalId, formData, onProgress) => {
  const response = await api.post(`/approvals/${approvalId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
  return response.data;
};

export const deleteApprovalDocument = async (documentId) => {
  const response = await api.delete(`/approval-documents/${documentId}`);
  return response.data;
};

export const getApprovalDocumentDownloadUrl = (documentId) => {
  const base = api.defaults.baseURL || '';
  const token = localStorage.getItem('token');
  return `${base}/approval-documents/${documentId}/download?token=${token}`;
};
