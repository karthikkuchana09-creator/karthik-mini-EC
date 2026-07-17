import api from './axios';

export const getForms = (params = {}) => api.get('/custom-forms', { params }).then(r => r.data);
export const getForm = (id) => api.get(`/custom-forms/${id}`).then(r => r.data);
export const createForm = (data) => api.post('/custom-forms', data).then(r => r.data);
export const updateForm = (id, data) => api.put(`/custom-forms/${id}`, data).then(r => r.data);
export const deleteForm = (id) => api.delete(`/custom-forms/${id}`).then(r => r.data);
export const submitForm = (formId, data) => api.post(`/custom-forms/${formId}/submit`, data).then(r => r.data);
export const getSubmissions = (formId, params = {}) => api.get(`/custom-forms/${formId}/submissions`, { params }).then(r => r.data);
