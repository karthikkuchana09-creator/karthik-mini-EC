import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import toast from 'react-hot-toast';

export const projectsKeys = {
  all: ['projects'],
  lists: () => [...projectsKeys.all, 'list'],
  list: (filters) => [...projectsKeys.lists(), filters],
  details: () => [...projectsKeys.all, 'detail'],
  detail: (id) => [...projectsKeys.details(), id],
  teams: (id) => [...projectsKeys.all, 'teams', id],
  channels: (id) => [...projectsKeys.all, 'channels', id],
  tasks: (projectId) => [...projectsKeys.all, 'tasks', projectId],
};

export function useProjects(filters) {
  return useQuery({
    queryKey: projectsKeys.list(filters),
    queryFn: () => projectService.getProjects(filters),
    select: (data) => (Array.isArray(data) ? data : data?.items || data?.results || []),
  });
}

export function useProject(id) {
  return useQuery({
    queryKey: projectsKeys.detail(id),
    queryFn: () => projectService.getProject(id),
    enabled: !!id,
  });
}

export function useProjectTeams(projectId) {
  return useQuery({
    queryKey: projectsKeys.teams(projectId),
    queryFn: () => projectService.getProjectTeams(projectId),
    enabled: !!projectId,
  });
}

export function useProjectChannels(projectId) {
  return useQuery({
    queryKey: projectsKeys.channels(projectId),
    queryFn: () => projectService.getProjectChannels(projectId),
    enabled: !!projectId,
  });
}

export function useProjectTasks(projectId, params) {
  return useQuery({
    queryKey: projectsKeys.tasks(projectId),
    queryFn: () => projectService.getProjectTasks(projectId, params),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => projectService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
      toast.success('Project created successfully');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => projectService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
      toast.success('Project updated successfully');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => projectService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
      toast.success('Project deleted successfully');
    },
  });
}

export function useAddProjectTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }) => projectService.addProjectTeam(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.teams(projectId) });
      toast.success('Team added to project');
    },
  });
}

export function useRemoveProjectTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, teamId }) => projectService.removeProjectTeam(projectId, teamId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.teams(projectId) });
      toast.success('Team removed from project');
    },
  });
}

export function useCreateProjectChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }) => projectService.createProjectChannel(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.channels(projectId) });
      toast.success('Channel created');
    },
  });
}

export function useCreateProjectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }) => projectService.createProjectTask(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.tasks(projectId) });
      toast.success('Task created');
    },
  });
}

export function useUpdateProjectTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, status }) => projectService.updateProjectTaskStatus(projectId, taskId, status),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.tasks(projectId) });
      toast.success('Task status updated');
    },
  });
}
