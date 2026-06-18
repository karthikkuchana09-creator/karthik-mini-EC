import api from './axios';

export const getChannelTasks = async (channelId, params = {}) => {
  const response = await api.get(`/channels/${channelId}/tasks`, { params });
  return response.data;
};

export const createChannelTask = async (channelId, data) => {
  const response = await api.post(`/channels/${channelId}/tasks`, data);
  return response.data;
};

export const getChannelTask = async (channelId, taskId) => {
  const response = await api.get(`/channels/${channelId}/tasks/${taskId}`);
  return response.data;
};

export const updateChannelTask = async (channelId, taskId, data) => {
  const response = await api.put(`/channels/${channelId}/tasks/${taskId}`, data);
  return response.data;
};

export const deleteChannelTask = async (channelId, taskId) => {
  const response = await api.delete(`/channels/${channelId}/tasks/${taskId}`);
  return response.data;
};

export const updateChannelTaskStatus = async (channelId, taskId, status) => {
  const response = await api.patch(`/channels/${channelId}/tasks/${taskId}/status`, { status });
  return response.data;
};

export const assignChannelTask = async (channelId, taskId, assignedToId) => {
  const response = await api.patch(`/channels/${channelId}/tasks/${taskId}/assign`, {
    assigned_to_id: assignedToId,
  });
  return response.data;
};
