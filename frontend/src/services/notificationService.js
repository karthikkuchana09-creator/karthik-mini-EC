import api from '../api/axios';

export const notificationService = {
  getAll(params) {
    return api.get('/notifications', { params }).then((r) => r.data);
  },

  getUnreadCount() {
    return api.get('/notifications/unread-count').then((r) => r.data);
  },

  getStats() {
    return api.get('/notifications/stats').then((r) => r.data);
  },

  markRead(id) {
    return api.patch(`/notifications/${id}/read`).then((r) => r.data);
  },

  markMultipleRead(ids) {
    return api.patch('/notifications/read', { notification_ids: ids }).then((r) => r.data);
  },

  markAllRead() {
    return api.patch('/notifications/read-all').then((r) => r.data);
  },

  delete(id) {
    return api.delete(`/notifications/${id}`).then((r) => r.data);
  },

  getPreferences() {
    return api.get('/notification-preferences/me').then((r) => r.data);
  },

  updatePreferences(prefs) {
    return api.put('/notification-preferences/me', prefs).then((r) => r.data);
  },
};
