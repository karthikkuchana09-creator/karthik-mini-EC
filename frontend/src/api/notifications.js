import api from './axios';

export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

export const getNotificationStats = async () => {
  const response = await api.get('/notifications/stats');
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markMultipleNotificationsRead = async (ids) => {
  const response = await api.patch('/notifications/read', { notification_ids: ids });
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

export const getPreferences = async () => {
  const response = await api.get('/notification-preferences/me');
  return response.data;
};

export const updatePreferences = async (preferences) => {
  const response = await api.put('/notification-preferences/me', preferences);
  return response.data;
};
