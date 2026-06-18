import api from '../api/axios';

export const channelMessageService = {
  getMessages(channelId, params) {
    return api.get(`/channels/${channelId}/messages`, { params }).then((r) => r.data);
  },

  sendMessage(channelId, data) {
    return api.post(`/channels/${channelId}/messages`, data).then((r) => r.data);
  },

  updateMessage(channelId, messageId, data) {
    return api.put(`/channels/${channelId}/messages/${messageId}`, data).then((r) => r.data);
  },

  deleteMessage(channelId, messageId) {
    return api.delete(`/channels/${channelId}/messages/${messageId}`).then((r) => r.data);
  },

  pinMessage(channelId, messageId) {
    return api.patch(`/channels/${channelId}/messages/${messageId}/pin`).then((r) => r.data);
  },

  unpinMessage(channelId, messageId) {
    return api.patch(`/channels/${channelId}/messages/${messageId}/unpin`).then((r) => r.data);
  },
};
