import api from './axios';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUser = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

export const toggleUserActive = async (userId) => {
  const response = await api.patch(`/users/${userId}/toggle-active`);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};
