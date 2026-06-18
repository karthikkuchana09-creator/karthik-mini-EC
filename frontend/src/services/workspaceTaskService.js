import api from '../api/axios';

export const workspaceTaskService = {
  getTasks(workspaceId, params) {
    return api.get(`/workspaces/${workspaceId}/tasks`, { params }).then((r) => r.data);
  },

  getTask(workspaceId, taskId) {
    return api.get(`/workspaces/${workspaceId}/tasks/${taskId}`).then((r) => r.data);
  },

  createTask(workspaceId, data) {
    return api.post(`/workspaces/${workspaceId}/tasks`, data).then((r) => r.data);
  },

  updateTask(workspaceId, taskId, data) {
    return api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data).then((r) => r.data);
  },

  deleteTask(workspaceId, taskId) {
    return api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`).then((r) => r.data);
  },

  updateStatus(workspaceId, taskId, status) {
    return api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/status`, { status }).then((r) => r.data);
  },

  assignTask(workspaceId, taskId, assignedToId) {
    return api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/assign`, { assigned_to_id: assignedToId }).then((r) => r.data);
  },
};
