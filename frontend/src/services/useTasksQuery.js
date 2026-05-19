import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../api/tasks';
import toast from 'react-hot-toast';

export const tasksKeys = {
  all: ['tasks'],
  lists: () => [...tasksKeys.all, 'list'],
  list: (filters) => [...tasksKeys.lists(), filters],
  details: () => [...tasksKeys.all, 'detail'],
  detail: (id) => [...tasksKeys.details(), id],
  kanban: () => [...tasksKeys.all, 'kanban'],
};

export function useTasks(filters) {
  return useQuery({
    queryKey: tasksKeys.list(filters),
    queryFn: () => tasksApi.getTasks(filters),
    select: (data) => Array.isArray(data) ? data : data?.items || [],
  });
}

export function useTask(id) {
  return useQuery({
    queryKey: tasksKeys.detail(id),
    queryFn: () => tasksApi.getTask(id),
    enabled: !!id,
  });
}

export function useKanbanTasks() {
  return useQuery({
    queryKey: tasksKeys.kanban(),
    queryFn: () => tasksApi.getKanbanTasks(),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData) => tasksApi.createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      toast.success('Task created successfully');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => tasksApi.updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(variables.id) });
      toast.success('Task updated successfully');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      toast.success('Task deleted successfully');
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => tasksApi.updateTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
