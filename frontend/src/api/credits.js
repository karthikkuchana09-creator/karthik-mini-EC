import api from './axios';

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

export const getLowCreditCheck = async () => {
  const res = await api.get('/credits/low-credit-check');
  return res.data;
};

export const purchaseCredits = async (credits) => {
  const res = await api.post(`/credits/purchase?credits=${credits}`);
  return res.data;
};

export const resetCredits = async () => {
  const res = await api.post('/credits/reset');
  return res.data;
};

export const getUsageCredits = async () => {
  const res = await api.get('/usage/credits');
  return res.data;
};

export const getUsageAi = async () => {
  const res = await api.get('/usage/ai');
  return res.data;
};
