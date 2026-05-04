import api from './axios';

export const getComments = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/comments`);
  return response.data;
};

export const addComment = async (taskId, content, isInternal = false) => {
  const response = await api.post(`/tasks/${taskId}/comments`, { content, is_internal: isInternal });
  return response.data;
};
