import api from '../api/axios';

const BASE = '/sla-rules';
const TRACKING = '/sla-tracking';

export const slaService = {
  getRules(params) {
    return api.get(BASE, { params }).then((r) => r.data);
  },

  getRule(id) {
    return api.get(`${BASE}/${id}`).then((r) => r.data);
  },

  createRule(data) {
    return api.post(BASE, data).then((r) => r.data);
  },

  updateRule(id, data) {
    return api.put(`${BASE}/${id}`, data).then((r) => r.data);
  },

  deleteRule(id) {
    return api.delete(`${BASE}/${id}`).then((r) => r.data);
  },

  toggleRule(id, isActive) {
    return api.patch(`${BASE}/${id}`, { is_active: isActive }).then((r) => r.data);
  },

  getTrackingActive(params) {
    return api.get(`${TRACKING}/active`, { params }).then((r) => r.data);
  },

  getTrackingBreached(params) {
    return api.get(`${TRACKING}/breached`, { params }).then((r) => r.data);
  },

  getTrackingByModule(moduleName, params) {
    return api.get(`${TRACKING}/module/${moduleName}`, { params }).then((r) => r.data);
  },

  getTrackingRecord(moduleName, recordId) {
    return api.get(`${TRACKING}/record/${moduleName}/${recordId}`).then((r) => r.data);
  },
};
