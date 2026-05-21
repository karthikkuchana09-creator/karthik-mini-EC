import api from './axios';

export const getDashboard = async () => {
  const res = await api.get('/admin/dashboard');
  return res.data;
};

export const getOrganizations = async () => {
  const res = await api.get('/admin/organizations');
  return res.data;
};

export const getSignupsTrend = async (days = 30) => {
  const res = await api.get('/admin/organizations/signups', { params: { days } });
  return res.data;
};

export const getPlanDistribution = async () => {
  const res = await api.get('/admin/organizations/plan-distribution');
  return res.data;
};

export const getRevenue = async () => {
  const res = await api.get('/admin/revenue');
  return res.data;
};

export const getRevenueByMonth = async (months = 12) => {
  const res = await api.get('/admin/revenue/by-month', { params: { months } });
  return res.data;
};

export const getSubscriptions = async () => {
  const res = await api.get('/admin/subscriptions');
  return res.data;
};

export const getUsers = async () => {
  const res = await api.get('/admin/users');
  return res.data;
};

export const getUserTrend = async (days = 30) => {
  const res = await api.get('/admin/users/trend', { params: { days } });
  return res.data;
};

export const getApiUsage = async () => {
  const res = await api.get('/admin/api-usage');
  return res.data;
};

export const getAiUsage = async () => {
  const res = await api.get('/admin/ai-usage');
  return res.data;
};

export const getAiTrend = async (days = 30) => {
  const res = await api.get('/admin/ai-usage/trend', { params: { days } });
  return res.data;
};
