import api from '../api/axios';

export const workspaceMessageService = {
  getMessages(workspaceId, params) {
    return api.get(`/workspaces/${workspaceId}/messages`, { params }).then((r) => r.data);
  },

  sendMessage(workspaceId, data) {
    return api.post(`/workspaces/${workspaceId}/messages`, data).then((r) => r.data);
  },

  updateMessage(workspaceId, messageId, data) {
    return api.put(`/workspaces/${workspaceId}/messages/${messageId}`, data).then((r) => r.data);
  },

  deleteMessage(workspaceId, messageId) {
    return api.delete(`/workspaces/${workspaceId}/messages/${messageId}`).then((r) => r.data);
  },

  pinMessage(workspaceId, messageId) {
    return api.patch(`/workspaces/${workspaceId}/messages/${messageId}/pin`).then((r) => r.data);
  },

  unpinMessage(workspaceId, messageId) {
    return api.patch(`/workspaces/${workspaceId}/messages/${messageId}/unpin`).then((r) => r.data);
  },
};
