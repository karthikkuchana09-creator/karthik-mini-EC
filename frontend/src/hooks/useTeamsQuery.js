import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../services/teamService';
import toast from 'react-hot-toast';

export const teamsKeys = {
  all: ['teams'],
  lists: () => [...teamsKeys.all, 'list'],
  list: (filters) => [...teamsKeys.lists(), filters],
  details: () => [...teamsKeys.all, 'detail'],
  detail: (id) => [...teamsKeys.details(), id],
  members: (id) => [...teamsKeys.all, 'members', id],
};

export function useTeams(filters) {
  return useQuery({
    queryKey: teamsKeys.list(filters),
    queryFn: () => teamService.getTeams(filters),
    select: (data) => (Array.isArray(data) ? data : data?.items || data?.results || []),
  });
}

export function useTeam(id) {
  return useQuery({
    queryKey: teamsKeys.detail(id),
    queryFn: () => teamService.getTeam(id),
    enabled: !!id,
  });
}

export function useTeamMembers(id, params) {
  return useQuery({
    queryKey: teamsKeys.members(id),
    queryFn: () => teamService.getTeamMembers(id, params),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => teamService.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success('Team created successfully');
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => teamService.updateTeam(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success('Team updated successfully');
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => teamService.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success('Team deleted successfully');
    },
  });
}

export function useArchiveTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => teamService.archiveTeam(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success('Team archived successfully');
    },
  });
}

export function useRestoreTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => teamService.restoreTeam(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success('Team restored successfully');
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, data }) => teamService.addTeamMember(teamId, data),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.members(teamId) });
      toast.success('Member added to team');
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }) => teamService.removeTeamMember(teamId, userId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.members(teamId) });
      toast.success('Member removed from team');
    },
  });
}
