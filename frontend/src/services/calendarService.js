import api from '../api/axios';

export const calendarService = {
  getProjectCalendarEvents(projectId, params) {
    return api.get(`/projects/${projectId}/calendar`, { params }).then((r) => r.data);
  },

  createCalendarEvent(projectId, data) {
    return api.post(`/projects/${projectId}/calendar`, data).then((r) => r.data);
  },

  updateCalendarEvent(projectId, eventId, data) {
    return api.put(`/projects/${projectId}/calendar/${eventId}`, data).then((r) => r.data);
  },

  deleteCalendarEvent(projectId, eventId) {
    return api.delete(`/projects/${projectId}/calendar/${eventId}`).then((r) => r.data);
  },

  getCalendarEvents(params) {
    return api.get('/calendar', { params }).then((r) => r.data);
  },

  getCalendarEvent(id) {
    return api.get(`/calendar/${id}`).then((r) => r.data);
  },
};
