import api from '../api/axios';

export const taskDocumentService = {
  getDocuments(taskId, params) {
    return api.get(`/tasks/${taskId}/documents`, { params }).then((r) => r.data);
  },

  uploadDocument(taskId, formData) {
    return api.post(`/tasks/${taskId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  deleteDocument(taskId, documentId) {
    return api.delete(`/tasks/${taskId}/documents/${documentId}`).then((r) => r.data);
  },
};
