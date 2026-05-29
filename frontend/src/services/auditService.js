import api from '../api/axios';

export const auditService = {
  getAll(params) {
    return api.get('/audit-logs', { params }).then((r) => r.data);
  },

  getById(id) {
    return api.get(`/audit-logs/${id}`).then((r) => r.data);
  },

  getByModule(moduleName, params) {
    return api.get(`/audit-logs/module/${moduleName}`, { params }).then((r) => r.data);
  },

  getByUser(userId, params) {
    return api.get(`/audit-logs/user/${userId}`, { params }).then((r) => r.data);
  },

  getByDateRange(startDate, endDate, params) {
    return api.get('/audit-logs/date-range', {
      params: { start_date: startDate, end_date: endDate, ...params },
    }).then((r) => r.data);
  },
};
