import api from './axios';

// ---- Organization ----
export const getOrganization = async (orgId) => {
  const res = await api.get(`/organizations/${orgId}`);
  return res.data;
};

export const updateOrganization = async (orgId, data) => {
  const res = await api.patch(`/organizations/${orgId}`, data);
  return res.data;
};

export const getOrgSettings = async (orgId) => {
  const res = await api.get(`/organizations/${orgId}/settings`);
  return res.data;
};

export const updateOrgSettings = async (orgId, data) => {
  const res = await api.patch(`/organizations/${orgId}/settings`, data);
  return res.data;
};

// ---- Members ----
export const getMembers = async (params = {}) => {
  const res = await api.get('/users', { params });
  return res.data;
};

export const updateMember = async (userId, data) => {
  const res = await api.put(`/users/${userId}`, data);
  return res.data;
};

export const toggleMemberActive = async (userId) => {
  const res = await api.patch(`/users/${userId}/toggle-active`);
  return res.data;
};

export const deleteMember = async (userId) => {
  const res = await api.delete(`/users/${userId}`);
  return res.data;
};

// ---- Invitations ----
export const createInvitation = async (orgId, data) => {
  const res = await api.post(`/organizations/${orgId}/invites`, data);
  return res.data;
};

// ---- Subscription ----
export const getPlans = async () => {
  const res = await api.get('/subscription/plans');
  return res.data;
};

export const getCurrentSubscription = async () => {
  const res = await api.get('/subscription/current');
  return res.data;
};

export const getSubscriptionFeatures = async () => {
  const res = await api.get('/subscription/features');
  return res.data;
};

export const upgradeSubscription = async (data) => {
  const res = await api.post('/subscription/upgrade', data);
  return res.data;
};

export const cancelSubscription = async (data = {}) => {
  const res = await api.post('/subscription/cancel', data);
  return res.data;
};

export const getBillingHistory = async (params = {}) => {
  const res = await api.get('/subscription/billing', { params });
  return res.data;
};

// ---- Billing / Invoices ----
export const getInvoices = async (params = {}) => {
  const res = await api.get('/billing/invoices', { params });
  return res.data;
};

export const getInvoiceDetail = async (invoiceId) => {
  const res = await api.get(`/billing/invoices/${invoiceId}`);
  return res.data;
};

export const getInvoicePdfUrl = (invoiceId) => {
  return `${api.defaults.baseURL}/billing/invoices/${invoiceId}/pdf`;
};

export const getPaymentHistory = async (params = {}) => {
  const res = await api.get('/payments/history', { params });
  return res.data;
};

export const getPricing = async () => {
  const res = await api.get('/payments/pricing');
  return res.data;
};

// ---- Usage ----
export const getCreditBalance = async () => {
  const res = await api.get('/credits/balance');
  return res.data;
};

export const getCreditTransactions = async (params = {}) => {
  const res = await api.get('/credits/transactions', { params });
  return res.data;
};

export const getCreditCosts = async () => {
  const res = await api.get('/credits/costs');
  return res.data;
};

export const getUsageAnalytics = async () => {
  const res = await api.get('/usage/analytics');
  return res.data;
};

export const getUsageCredits = async () => {
  const res = await api.get('/usage/credits');
  return res.data;
};

export const getUsageStorage = async () => {
  const res = await api.get('/usage/storage');
  return res.data;
};

export const getUsageApi = async () => {
  const res = await api.get('/usage/api');
  return res.data;
};

export const getUsageAi = async () => {
  const res = await api.get('/usage/ai');
  return res.data;
};
