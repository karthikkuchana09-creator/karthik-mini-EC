import api from '../api/axios';

export const workspaceService = {
  getWorkspaces(params) {
    return api.get('/workspaces', { params }).then((r) => r.data);
  },

  getWorkspace(id) {
    return api.get(`/workspaces/${id}`).then((r) => r.data);
  },

  createWorkspace(data) {
    return api.post('/workspaces', data).then((r) => r.data);
  },

  updateWorkspace(id, data) {
    return api.put(`/workspaces/${id}`, data).then((r) => r.data);
  },

  archiveWorkspace(id) {
    return api.patch(`/workspaces/${id}/archive`).then((r) => r.data);
  },

  restoreWorkspace(id) {
    return api.patch(`/workspaces/${id}/restore`).then((r) => r.data);
  },

  getWorkspaceMembers(id, params) {
    return api.get(`/workspaces/${id}/members`, { params }).then((r) => r.data);
  },

  addWorkspaceMember(id, data) {
    return api.post(`/workspaces/${id}/members`, data).then((r) => r.data);
  },

  updateMemberRole(workspaceId, userId, data) {
    return api.patch(`/workspaces/${workspaceId}/members/${userId}/role`, data).then((r) => r.data);
  },

  removeWorkspaceMember(workspaceId, userId) {
    return api.delete(`/workspaces/${workspaceId}/members/${userId}`).then((r) => r.data);
  },
};
