import api from './axios';

export const getSummary = async () => {
  const res = await api.get('/saas/dashboard/summary');
  return res.data;
};

export const getTenantGrowth = async (days = 30) => {
  const res = await api.get('/saas/dashboard/tenant-growth', { params: { days } });
  return res.data;
};

export const getUsage = async () => {
  const res = await api.get('/saas/dashboard/usage');
  return res.data;
};

export const getTopTenants = async ({ page = 1, size = 15 } = {}) => {
  const res = await api.get('/saas/dashboard/top-tenants', { params: { page, size } });
  return res.data;
};
