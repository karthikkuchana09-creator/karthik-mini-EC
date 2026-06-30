import { useQuery } from '@tanstack/react-query';
import { workloadService } from '../services/workloadService';

export const workloadKeys = {
  all: ['workload'],
  team: (teamId) => [...workloadKeys.all, 'team', teamId],
  project: (projectId) => [...workloadKeys.all, 'project', projectId],
  user: (userId) => [...workloadKeys.all, 'user', userId],
  summary: (params) => [...workloadKeys.all, 'summary', params],
  distribution: (params) => [...workloadKeys.all, 'distribution', params],
  capacity: (params) => [...workloadKeys.all, 'capacity', params],
};

export function useTeamWorkload(teamId, params) {
  return useQuery({
    queryKey: workloadKeys.team(teamId),
    queryFn: () => workloadService.getTeamWorkload(teamId, params),
    enabled: !!teamId,
  });
}

export function useProjectWorkload(projectId, params) {
  return useQuery({
    queryKey: workloadKeys.project(projectId),
    queryFn: () => workloadService.getProjectWorkload(projectId, params),
    enabled: !!projectId,
  });
}

export function useUserWorkload(userId, params) {
  return useQuery({
    queryKey: workloadKeys.user(userId),
    queryFn: () => workloadService.getUserWorkload(userId, params),
    enabled: !!userId,
  });
}

export function useWorkloadSummary(params) {
  return useQuery({
    queryKey: workloadKeys.summary(params),
    queryFn: () => workloadService.getWorkloadSummary(params),
  });
}

export function useWorkloadDistribution(params) {
  return useQuery({
    queryKey: workloadKeys.distribution(params),
    queryFn: () => workloadService.getWorkloadDistribution(params),
  });
}

export function useCapacityAnalysis(params) {
  return useQuery({
    queryKey: workloadKeys.capacity(params),
    queryFn: () => workloadService.getCapacityAnalysis(params),
  });
}
