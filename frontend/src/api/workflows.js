import api from './axios';

export const getWorkflows = (params = {}) => api.get('/workflows', { params }).then(r => r.data);
export const getWorkflow = (id) => api.get(`/workflows/${id}`).then(r => r.data);
export const createWorkflow = (data) => api.post('/workflows', data).then(r => r.data);
export const updateWorkflow = (id, data) => api.put(`/workflows/${id}`, data).then(r => r.data);
export const deleteWorkflow = (id) => api.delete(`/workflows/${id}`).then(r => r.data);

export const addStage = (workflowId, data) => api.post(`/workflows/${workflowId}/stages`, data).then(r => r.data);
export const updateStage = (stageId, data) => api.put(`/workflows/stages/${stageId}`, data).then(r => r.data);
export const deleteStage = (stageId) => api.delete(`/workflows/stages/${stageId}`).then(r => r.data);

export const addTransition = (workflowId, data) => api.post(`/workflows/${workflowId}/transitions`, data).then(r => r.data);

export const executeWorkflow = (data) => api.post('/workflows/execute', data).then(r => r.data);
export const advanceWorkflow = (executionId, transitionId) => api.post(`/workflows/executions/${executionId}/advance`, null, { params: { transition_id: transitionId } }).then(r => r.data);
export const getExecutions = (params = {}) => api.get('/workflows/executions', { params }).then(r => r.data);
