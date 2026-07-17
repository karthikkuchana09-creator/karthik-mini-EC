import api from './axios';

export const globalSearch = (params = {}) => api.get('/search', { params }).then(r => r.data);
