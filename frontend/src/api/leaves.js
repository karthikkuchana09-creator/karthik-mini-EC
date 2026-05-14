import api from './axios';

export const createLeave = async (data) => {
  const response = await api.post('/leaves', data);
  return response.data;
};

export const getLeaves = async () => {
  const response = await api.get('/leaves');
  return response.data;
};

export const updateLeave = async (leaveId, data) => {
  const response = await api.put(`/leaves/${leaveId}`, data);
  return response.data;
};
