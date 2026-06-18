import api from './axios';

export const getChannelMessages = async (channelId, params = {}) => {
  const response = await api.get(`/channels/${channelId}/messages`, { params });
  return response.data;
};

export const sendChannelMessage = async (channelId, data) => {
  const response = await api.post(`/channels/${channelId}/messages`, data);
  return response.data;
};

export const updateChannelMessage = async (messageId, data) => {
  const response = await api.put(`/channel-messages/${messageId}`, data);
  return response.data;
};

export const deleteChannelMessage = async (messageId) => {
  const response = await api.delete(`/channel-messages/${messageId}`);
  return response.data;
};

export const pinChannelMessage = async (channelId, messageId) => {
  const response = await api.patch(`/channels/${channelId}/messages/${messageId}/pin`);
  return response.data;
};

export const unpinChannelMessage = async (channelId, messageId) => {
  const response = await api.patch(`/channels/${channelId}/messages/${messageId}/unpin`);
  return response.data;
};
