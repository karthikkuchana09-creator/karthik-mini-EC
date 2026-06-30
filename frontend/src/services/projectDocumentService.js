import api from '../api/axios';

export const projectDocumentService = {
  getProjectDocuments(projectId, params) {
    return api.get(`/projects/${projectId}/documents`, { params }).then((r) => r.data);
  },

  getProjectDocument(projectId, documentId) {
    return api.get(`/projects/${projectId}/documents/${documentId}`).then((r) => r.data);
  },

  uploadProjectDocument(projectId, formData, onProgress) {
    return api.post(`/projects/${projectId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }).then((r) => r.data);
  },

  deleteProjectDocument(projectId, documentId) {
    return api.delete(`/projects/${projectId}/documents/${documentId}`).then((r) => r.data);
  },

  downloadProjectDocument(projectId, documentId) {
    return api.get(`/projects/${projectId}/documents/${documentId}/download`, {
      responseType: 'blob',
    }).then((r) => r.data);
  },

  updateProjectDocument(projectId, documentId, data) {
    return api.patch(`/projects/${projectId}/documents/${documentId}`, data).then((r) => r.data);
  },
};
