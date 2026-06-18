import api from './axios';

export const getWorkspaceMessages = async (workspaceId, params = {}) => {
  const response = await api.get(`/workspaces/${workspaceId}/messages`, { params });
  return response.data;
};

export const sendWorkspaceMessage = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/messages`, data);
  return response.data;
};

export const updateWorkspaceMessage = async (messageId, data) => {
  const response = await api.put(`/workspace-messages/${messageId}`, data);
  return response.data;
};

export const deleteWorkspaceMessage = async (messageId) => {
  const response = await api.delete(`/workspace-messages/${messageId}`);
  return response.data;
};

export const pinWorkspaceMessage = async (workspaceId, messageId) => {
  const response = await api.patch(`/workspaces/${workspaceId}/messages/${messageId}/pin`);
  return response.data;
};

export const unpinWorkspaceMessage = async (workspaceId, messageId) => {
  const response = await api.patch(`/workspaces/${workspaceId}/messages/${messageId}/unpin`);
  return response.data;
};
