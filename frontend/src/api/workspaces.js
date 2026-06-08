import api from './axios';

export const getWorkspaces = async (params = {}) => {
  const response = await api.get('/workspaces', { params });
  return response.data;
};

export const getWorkspace = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}`);
  return response.data;
};

export const createWorkspace = async (data) => {
  const response = await api.post('/workspaces', data);
  return response.data;
};

export const updateWorkspace = async (workspaceId, data) => {
  const response = await api.put(`/workspaces/${workspaceId}`, data);
  return response.data;
};

export const archiveWorkspace = async (workspaceId) => {
  const response = await api.patch(`/workspaces/${workspaceId}/archive`);
  return response.data;
};

export const restoreWorkspace = async (workspaceId) => {
  const response = await api.patch(`/workspaces/${workspaceId}/restore`);
  return response.data;
};

export const getWorkspaceMembers = async (workspaceId, params = {}) => {
  const response = await api.get(`/workspaces/${workspaceId}/members`, { params });
  return response.data;
};

export const addWorkspaceMember = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/members`, data);
  return response.data;
};

export const updateMemberRole = async (workspaceId, userId, data) => {
  const response = await api.patch(`/workspaces/${workspaceId}/members/${userId}/role`, data);
  return response.data;
};

export const removeWorkspaceMember = async (workspaceId, userId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  return response.data;
};
