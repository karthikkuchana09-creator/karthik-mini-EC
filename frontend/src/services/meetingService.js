import api from '../api/axios';

export const meetingService = {
  getMeetings(params) {
    return api.get('/meetings', { params }).then((r) => r.data);
  },

  getMeeting(id) {
    return api.get(`/meetings/${id}`).then((r) => r.data);
  },

  createMeeting(data) {
    return api.post('/meetings', data).then((r) => r.data);
  },

  updateMeeting(id, data) {
    return api.put(`/meetings/${id}`, data).then((r) => r.data);
  },

  deleteMeeting(id) {
    return api.delete(`/meetings/${id}`).then((r) => r.data);
  },

  getProjectMeetings(projectId, params) {
    return api.get(`/projects/${projectId}/meetings`, { params }).then((r) => r.data);
  },

  createProjectMeeting(projectId, data) {
    return api.post(`/projects/${projectId}/meetings`, data).then((r) => r.data);
  },

  updateProjectMeeting(projectId, meetingId, data) {
    return api.put(`/projects/${projectId}/meetings/${meetingId}`, data).then((r) => r.data);
  },

  deleteProjectMeeting(projectId, meetingId) {
    return api.delete(`/projects/${projectId}/meetings/${meetingId}`).then((r) => r.data);
  },

  confirmAttendance(projectId, meetingId) {
    return api.patch(`/projects/${projectId}/meetings/${meetingId}/attend`).then((r) => r.data);
  },

  getMeetingAttendees(meetingId) {
    return api.get(`/meetings/${meetingId}/attendees`).then((r) => r.data);
  },

  addMeetingAttendee(meetingId, data) {
    return api.post(`/meetings/${meetingId}/attendees`, data).then((r) => r.data);
  },

  removeMeetingAttendee(meetingId, userId) {
    return api.delete(`/meetings/${meetingId}/attendees/${userId}`).then((r) => r.data);
  },

  getMeetingNotes(meetingId) {
    return api.get(`/meetings/${meetingId}/notes`).then((r) => r.data);
  },

  createMeetingNote(meetingId, data) {
    return api.post(`/meetings/${meetingId}/notes`, data).then((r) => r.data);
  },

  updateMeetingNote(noteId, data) {
    return api.put(`/meeting-notes/${noteId}`, data).then((r) => r.data);
  },

  getMeetingSummary(meetingId) {
    return api.get(`/meetings/${meetingId}/summary`).then((r) => r.data);
  },

  createMeetingSummary(meetingId, data) {
    return api.post(`/meetings/${meetingId}/summary`, data).then((r) => r.data);
  },
};
