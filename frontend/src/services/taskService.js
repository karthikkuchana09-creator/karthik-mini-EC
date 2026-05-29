import api from '../api/axios';

export const taskService = {
  getTasks(params) {
    return api.get('/tasks', { params }).then((r) => r.data);
  },

  getTask(id) {
    return api.get(`/tasks/${id}`).then((r) => r.data);
  },

  createTask(data) {
    return api.post('/tasks', data).then((r) => r.data);
  },

  updateTask(id, data) {
    return api.put(`/tasks/${id}`, data).then((r) => r.data);
  },

  deleteTask(id) {
    return api.delete(`/tasks/${id}`).then((r) => r.data);
  },

  assignTask(id, assignedToId) {
    return api.patch(`/tasks/${id}/assign`, null, {
      params: { assigned_to_id: assignedToId },
    }).then((r) => r.data);
  },

  updateStatus(id, status) {
    return api.patch(`/tasks/${id}/status`, { status }).then((r) => r.data);
  },

  getKanbanTasks(params) {
    return api.get('/tasks/kanban', { params }).then((r) => r.data);
  },
};
