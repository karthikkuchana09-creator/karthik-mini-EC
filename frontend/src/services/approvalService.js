import api from '../api/axios';

export const approvalService = {
  getApprovals(params) {
    return api.get('/approvals', { params }).then((r) => r.data);
  },

  getApproval(id) {
    return api.get(`/approvals/${id}`).then((r) => r.data);
  },

  updateApproval(id, action, comment) {
    return api.patch(`/approvals/${id}/action`, { action, comment }).then((r) => r.data);
  },

  getApprovalHistory(id) {
    return api.get(`/approvals/${id}/history`).then((r) => r.data);
  },

  getEscalations(params) {
    return api.get('/approval-escalations', { params }).then((r) => r.data);
  },

  getPendingEscalations() {
    return api.get('/approval-escalations/pending').then((r) => r.data);
  },

  getEscalationsByApproval(approvalId) {
    return api.get(`/approval-escalations/approval/${approvalId}`).then((r) => r.data);
  },

  createEscalation(data) {
    return api.post('/approval-escalations', data).then((r) => r.data);
  },

  resolveEscalation(id) {
    return api.put(`/approval-escalations/${id}/resolve`).then((r) => r.data);
  },

  cancelEscalation(id) {
    return api.put(`/approval-escalations/${id}/cancel`).then((r) => r.data);
  },

  getDelegations(params) {
    return api.get('/approval-delegations', { params }).then((r) => r.data);
  },

  getMyDelegations() {
    return api.get('/approval-delegations/me').then((r) => r.data);
  },

  getActiveDelegations() {
    return api.get('/approval-delegations/active').then((r) => r.data);
  },

  createDelegation(data) {
    return api.post('/approval-delegations', data).then((r) => r.data);
  },

  cancelDelegation(id) {
    return api.put(`/approval-delegations/${id}/cancel`).then((r) => r.data);
  },

  toggleDelegation(id, isActive) {
    return api.patch(`/approval-delegations/${id}`, { is_active: isActive }).then((r) => r.data);
  },
};
