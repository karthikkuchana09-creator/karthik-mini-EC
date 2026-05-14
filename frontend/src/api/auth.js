import api from './axios';

export const login = async (email, password) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const response = await api.post('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

export const register = async (name, email, password, role) => {
  const response = await api.post('/auth/register', { name, email, password, role });
  return response.data;
};

export const refreshToken = async (token) => {
  const response = await api.post('/auth/refresh', { refresh_token: token });
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
  }
};
