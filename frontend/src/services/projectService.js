import api from '../api/axios';

export const projectService = {
  getProjects(params) {
    return api.get('/projects', { params }).then((r) => r.data);
  },

  getProject(id) {
    return api.get(`/projects/${id}`).then((r) => r.data);
  },

  createProject(data) {
    return api.post('/projects', data).then((r) => r.data);
  },

  updateProject(id, data) {
    return api.put(`/projects/${id}`, data).then((r) => r.data);
  },

  deleteProject(id) {
    return api.delete(`/projects/${id}`).then((r) => r.data);
  },

  archiveProject(id) {
    return api.patch(`/projects/${id}/archive`).then((r) => r.data);
  },

  restoreProject(id) {
    return api.patch(`/projects/${id}/restore`).then((r) => r.data);
  },

  getProjectTeams(projectId) {
    return api.get(`/projects/${projectId}/teams`).then((r) => r.data);
  },

  addProjectTeam(projectId, data) {
    return api.post(`/projects/${projectId}/teams`, data).then((r) => r.data);
  },

  removeProjectTeam(projectId, teamId) {
    return api.delete(`/projects/${projectId}/teams/${teamId}`).then((r) => r.data);
  },

  getProjectChannels(projectId, params) {
    return api.get(`/projects/${projectId}/channels`, { params }).then((r) => r.data);
  },

  createProjectChannel(projectId, data) {
    return api.post(`/projects/${projectId}/channels`, data).then((r) => r.data);
  },

  updateProjectChannel(projectId, channelId, data) {
    return api.put(`/projects/${projectId}/channels/${channelId}`, data).then((r) => r.data);
  },

  deleteProjectChannel(projectId, channelId) {
    return api.delete(`/projects/${projectId}/channels/${channelId}`).then((r) => r.data);
  },

  getProjectTasks(projectId, params) {
    return api.get(`/projects/${projectId}/tasks`, { params }).then((r) => r.data);
  },

  createProjectTask(projectId, data) {
    return api.post(`/projects/${projectId}/tasks`, data).then((r) => r.data);
  },

  updateProjectTask(projectId, taskId, data) {
    return api.put(`/projects/${projectId}/tasks/${taskId}`, data).then((r) => r.data);
  },

  updateProjectTaskStatus(projectId, taskId, status) {
    return api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status }).then((r) => r.data);
  },

  deleteProjectTask(projectId, taskId) {
    return api.delete(`/projects/${projectId}/tasks/${taskId}`).then((r) => r.data);
  },

  getProjectDocuments(projectId, params) {
    return api.get(`/projects/${projectId}/documents`, { params }).then((r) => r.data);
  },

  getProjectActivity(projectId, params) {
    return api.get(`/projects/${projectId}/activity`, { params }).then((r) => r.data);
  },
};
