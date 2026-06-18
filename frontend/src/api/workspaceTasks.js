import api from './axios';

export const getWorkspaceTasks = async (workspaceId, params = {}) => {
  const response = await api.get(`/workspaces/${workspaceId}/tasks`, { params });
  return response.data;
};

export const createWorkspaceTask = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/tasks`, data);
  return response.data;
};

export const getWorkspaceTask = async (workspaceId, taskId) => {
  const response = await api.get(`/workspaces/${workspaceId}/tasks/${taskId}`);
  return response.data;
};

export const updateWorkspaceTask = async (workspaceId, taskId, data) => {
  const response = await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data);
  return response.data;
};

export const deleteWorkspaceTask = async (workspaceId, taskId) => {
  const response = await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
  return response.data;
};

export const updateWorkspaceTaskStatus = async (workspaceId, taskId, status) => {
  const response = await api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/status`, { status });
  return response.data;
};

export const assignWorkspaceTask = async (workspaceId, taskId, assignedToId) => {
  const response = await api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/assign`, {
    assigned_to_id: assignedToId,
  });
  return response.data;
};
