import api from './axios';

export const getKanbanTasks = async () => {
  const response = await api.get('/tasks/kanban');
  return response.data;
};

export const updateTaskStatus = async (taskId, newStatus) => {
  const response = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
  return response.data;
};
