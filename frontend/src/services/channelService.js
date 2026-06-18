import api from '../api/axios';

export const channelService = {
  getChannels(params) {
    return api.get('/channels', { params }).then((r) => r.data);
  },

  getWorkspaceChannels(workspaceId, params) {
    return api.get(`/workspaces/${workspaceId}/channels`, { params }).then((r) => r.data);
  },

  getChannel(id) {
    return api.get(`/channels/${id}`).then((r) => r.data);
  },

  createChannel(data) {
    return api.post('/channels', data).then((r) => r.data);
  },

  updateChannel(id, data) {
    return api.put(`/channels/${id}`, data).then((r) => r.data);
  },

  archiveChannel(id) {
    return api.patch(`/channels/${id}/archive`).then((r) => r.data);
  },

  restoreChannel(id) {
    return api.patch(`/channels/${id}/restore`).then((r) => r.data);
  },

  joinChannel(id) {
    return api.post(`/channels/${id}/join`).then((r) => r.data);
  },

  leaveChannel(id) {
    return api.post(`/channels/${id}/leave`).then((r) => r.data);
  },
};
