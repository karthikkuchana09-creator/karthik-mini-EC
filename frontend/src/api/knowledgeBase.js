import api from './axios';

export const getCategories = () => api.get('/knowledge-base/categories').then(r => r.data);
export const createCategory = (data) => api.post('/knowledge-base/categories', data).then(r => r.data);
export const updateCategory = (id, data) => api.put(`/knowledge-base/categories/${id}`, data).then(r => r.data);
export const deleteCategory = (id) => api.delete(`/knowledge-base/categories/${id}`).then(r => r.data);

export const getArticles = (params = {}) => api.get('/knowledge-base/articles', { params }).then(r => r.data);
export const getArticle = (id) => api.get(`/knowledge-base/articles/${id}`).then(r => r.data);
export const createArticle = (data) => api.post('/knowledge-base/articles', data).then(r => r.data);
export const updateArticle = (id, data) => api.put(`/knowledge-base/articles/${id}`, data).then(r => r.data);
export const deleteArticle = (id) => api.delete(`/knowledge-base/articles/${id}`).then(r => r.data);
