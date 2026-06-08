import api from './axios';

export const getChannels = async (params = {}) => {
  const response = await api.get('/channels', { params });
  return response.data;
};

export const getWorkspaceChannels = async (workspaceId, params = {}) => {
  const response = await api.get(`/workspaces/${workspaceId}/channels`, { params });
  return response.data;
};

export const getChannel = async (channelId) => {
  const response = await api.get(`/channels/${channelId}`);
  return response.data;
};

export const createChannel = async (data) => {
  const response = await api.post('/channels', data);
  return response.data;
};

export const updateChannel = async (channelId, data) => {
  const response = await api.put(`/channels/${channelId}`, data);
  return response.data;
};

export const archiveChannel = async (channelId) => {
  const response = await api.patch(`/channels/${channelId}/archive`);
  return response.data;
};

export const restoreChannel = async (channelId) => {
  const response = await api.patch(`/channels/${channelId}/restore`);
  return response.data;
};

export const joinChannel = async (channelId) => {
  const response = await api.post(`/channels/${channelId}/join`);
  return response.data;
};

export const leaveChannel = async (channelId) => {
  const response = await api.post(`/channels/${channelId}/leave`);
  return response.data;
};
