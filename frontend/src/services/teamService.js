import api from '../api/axios';

export const teamService = {
  getTeams(params) {
    return api.get('/teams', { params }).then((r) => r.data);
  },

  getTeam(id) {
    return api.get(`/teams/${id}`).then((r) => r.data);
  },

  createTeam(data) {
    return api.post('/teams', data).then((r) => r.data);
  },

  updateTeam(id, data) {
    return api.put(`/teams/${id}`, data).then((r) => r.data);
  },

  deleteTeam(id) {
    return api.delete(`/teams/${id}`).then((r) => r.data);
  },

  getTeamMembers(id, params) {
    return api.get(`/teams/${id}/members`, { params }).then((r) => r.data);
  },

  addTeamMember(id, data) {
    return api.post(`/teams/${id}/members`, data).then((r) => r.data);
  },

  removeTeamMember(teamId, userId) {
    return api.delete(`/teams/${teamId}/members/${userId}`).then((r) => r.data);
  },

  archiveTeam(id) {
    return api.patch(`/teams/${id}/archive`).then((r) => r.data);
  },

  restoreTeam(id) {
    return api.patch(`/teams/${id}/restore`).then((r) => r.data);
  },

  getWorkspaceTeams(workspaceId, params) {
    return api.get(`/workspaces/${workspaceId}/teams`, { params }).then((r) => r.data);
  },

  createWorkspaceTeam(workspaceId, data) {
    return api.post(`/workspaces/${workspaceId}/teams`, data).then((r) => r.data);
  },

  getWorkspaceTeam(workspaceId, teamId) {
    return api.get(`/workspaces/${workspaceId}/teams/${teamId}`).then((r) => r.data);
  },

  updateWorkspaceTeam(workspaceId, teamId, data) {
    return api.put(`/workspaces/${workspaceId}/teams/${teamId}`, data).then((r) => r.data);
  },

  deleteWorkspaceTeam(workspaceId, teamId) {
    return api.delete(`/workspaces/${workspaceId}/teams/${teamId}`).then((r) => r.data);
  },

  archiveWorkspaceTeam(workspaceId, teamId) {
    return api.patch(`/workspaces/${workspaceId}/teams/${teamId}/archive`).then((r) => r.data);
  },

  restoreWorkspaceTeam(workspaceId, teamId) {
    return api.patch(`/workspaces/${workspaceId}/teams/${teamId}/restore`).then((r) => r.data);
  },
};
