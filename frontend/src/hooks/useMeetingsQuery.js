import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../services/meetingService';
import toast from 'react-hot-toast';

export const meetingsKeys = {
  all: ['meetings'],
  lists: () => [...meetingsKeys.all, 'list'],
  list: (filters) => [...meetingsKeys.lists(), filters],
  details: () => [...meetingsKeys.all, 'detail'],
  detail: (id) => [...meetingsKeys.details(), id],
  project: (projectId) => [...meetingsKeys.all, 'project', projectId],
};

export function useMeetings(filters) {
  return useQuery({
    queryKey: meetingsKeys.list(filters),
    queryFn: () => meetingService.getMeetings(filters),
    select: (data) => (Array.isArray(data) ? data : data?.items || data?.results || []),
  });
}

export function useMeeting(id) {
  return useQuery({
    queryKey: meetingsKeys.detail(id),
    queryFn: () => meetingService.getMeeting(id),
    enabled: !!id,
  });
}

export function useProjectMeetings(projectId, filters) {
  return useQuery({
    queryKey: meetingsKeys.project(projectId),
    queryFn: () => meetingService.getProjectMeetings(projectId, filters),
    enabled: !!projectId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => meetingService.createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingsKeys.lists() });
      toast.success('Meeting created successfully');
    },
  });
}

export function useCreateProjectMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }) => meetingService.createProjectMeeting(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: meetingsKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: meetingsKeys.lists() });
      toast.success('Meeting scheduled');
    },
  });
}

export function useUpdateProjectMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, meetingId, data }) => meetingService.updateProjectMeeting(projectId, meetingId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: meetingsKeys.project(projectId) });
      toast.success('Meeting updated');
    },
  });
}

export function useDeleteProjectMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, meetingId }) => meetingService.deleteProjectMeeting(projectId, meetingId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: meetingsKeys.project(projectId) });
      toast.success('Meeting cancelled');
    },
  });
}

export function useConfirmAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, meetingId }) => meetingService.confirmAttendance(projectId, meetingId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: meetingsKeys.project(projectId) });
      toast.success('Attendance confirmed');
    },
  });
}
