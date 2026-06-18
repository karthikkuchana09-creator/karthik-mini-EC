import api from '../api/axios';

export const channelTaskService = {
  getTasks(channelId, params) {
    return api.get(`/channels/${channelId}/tasks`, { params }).then((r) => r.data);
  },

  getTask(channelId, taskId) {
    return api.get(`/channels/${channelId}/tasks/${taskId}`).then((r) => r.data);
  },

  createTask(channelId, data) {
    return api.post(`/channels/${channelId}/tasks`, data).then((r) => r.data);
  },

  updateTask(channelId, taskId, data) {
    return api.put(`/channels/${channelId}/tasks/${taskId}`, data).then((r) => r.data);
  },

  deleteTask(channelId, taskId) {
    return api.delete(`/channels/${channelId}/tasks/${taskId}`).then((r) => r.data);
  },

  updateStatus(channelId, taskId, status) {
    return api.patch(`/channels/${channelId}/tasks/${taskId}/status`, { status }).then((r) => r.data);
  },

  assignTask(channelId, taskId, assignedToId) {
    return api.patch(`/channels/${channelId}/tasks/${taskId}/assign`, { assigned_to_id: assignedToId }).then((r) => r.data);
  },
};
