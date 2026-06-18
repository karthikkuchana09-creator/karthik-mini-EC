import api from './axios';

export const getTaskDocuments = async (taskId, params = {}) => {
  const response = await api.get(`/tasks/${taskId}/documents`, { params });
  return response.data;
};

export const uploadTaskDocument = async (taskId, formData, onProgress) => {
  const response = await api.post(`/tasks/${taskId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
  return response.data;
};

export const deleteTaskDocument = async (documentId) => {
  const response = await api.delete(`/task-documents/${documentId}`);
  return response.data;
};

export const getTaskDocumentDownloadUrl = (documentId) => {
  const base = api.defaults.baseURL || '';
  const token = localStorage.getItem('token');
  return `${base}/task-documents/${documentId}/download?token=${token}`;
};
