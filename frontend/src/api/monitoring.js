import api from './axios';

export const getHealth = () => api.get('/monitoring/health');
export const getDetailedHealth = () => api.get('/monitoring/health/detailed');
export const getBackgroundQueue = () => api.get('/monitoring/background-queue');
export const getWebhookRetries = () => api.get('/monitoring/webhook-retries');
export const getTenantPerformance = (hours = 24) => api.get('/monitoring/tenant-performance', { params: { hours } });
export const triggerUsageAggregation = () => api.post('/monitoring/scheduler/trigger/usage-aggregation');
export const triggerSubscriptionChecks = () => api.post('/monitoring/scheduler/trigger/subscription-checks');
export const triggerWebhookRetries = () => api.post('/monitoring/scheduler/trigger/webhook-retries');
