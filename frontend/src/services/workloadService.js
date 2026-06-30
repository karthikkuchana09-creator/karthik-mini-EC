import api from '../api/axios';

export const workloadService = {
  getTeamWorkload(teamId, params) {
    return api.get(`/teams/${teamId}/workload`, { params }).then((r) => r.data);
  },

  getProjectWorkload(projectId, params) {
    return api.get(`/projects/${projectId}/workload`, { params }).then((r) => r.data);
  },

  getUserWorkload(userId, params) {
    return api.get(`/users/${userId}/workload`, { params }).then((r) => r.data);
  },

  getWorkloadSummary(params) {
    return api.get('/workload/summary', { params }).then((r) => r.data);
  },

  getWorkloadDistribution(params) {
    return api.get('/workload/distribution', { params }).then((r) => r.data);
  },

  getCapacityAnalysis(params) {
    return api.get('/workload/capacity', { params }).then((r) => r.data);
  },
};
