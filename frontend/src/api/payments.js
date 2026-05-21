import api from './axios';

export const getPricing = async () => {
  const res = await api.get('/payments/pricing');
  return res.data;
};

export const getPlansWithPricing = async () => {
  const res = await api.get('/payments/plans');
  return res.data;
};

export const createOrder = async (data) => {
  const res = await api.post('/payments/create-order', data);
  return res.data;
};

export const verifyPayment = async (data) => {
  const res = await api.post('/payments/verify', data);
  return res.data;
};

export const createSubscriptionLink = async (data) => {
  const res = await api.post('/payments/create-subscription', data);
  return res.data;
};

export const getPaymentHistory = async (params = {}) => {
  const res = await api.get('/payments/history', { params });
  return res.data;
};
