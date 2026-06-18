import api from '../api/axios';

export const approvalDocumentService = {
  getDocuments(approvalId, params) {
    return api.get(`/approvals/${approvalId}/documents`, { params }).then((r) => r.data);
  },

  uploadDocument(approvalId, formData) {
    return api.post(`/approvals/${approvalId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  deleteDocument(approvalId, documentId) {
    return api.delete(`/approvals/${approvalId}/documents/${documentId}`).then((r) => r.data);
  },
};
