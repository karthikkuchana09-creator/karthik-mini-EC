import api from './axios';

export const uploadDocument = async (formData) => {
  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getTaskDocuments = async (taskId) => {
  const response = await api.get(`/documents/task/${taskId}`);
  return response.data;
};

export const getDocument = async (documentId) => {
  const response = await api.get(`/documents/${documentId}`);
  return response.data;
};

export const getDocumentDownloadUrl = (documentId) => {
  const token = localStorage.getItem('token');
  return `http://127.0.0.1:8000/documents/${documentId}/download?token=${token}`;
};
