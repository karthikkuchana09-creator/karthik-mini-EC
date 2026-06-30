import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '../services/calendarService';
import toast from 'react-hot-toast';

export const calendarKeys = {
  all: ['calendar'],
  lists: () => [...calendarKeys.all, 'list'],
  list: (filters) => [...calendarKeys.lists(), filters],
  project: (projectId) => [...calendarKeys.all, 'project', projectId],
};

export function useCalendarEvents(filters) {
  return useQuery({
    queryKey: calendarKeys.list(filters),
    queryFn: () => calendarService.getCalendarEvents(filters),
    select: (data) => (Array.isArray(data) ? data : data?.items || data?.results || []),
  });
}

export function useProjectCalendarEvents(projectId, filters) {
  return useQuery({
    queryKey: calendarKeys.project(projectId),
    queryFn: () => calendarService.getProjectCalendarEvents(projectId, filters),
    enabled: !!projectId,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }) => calendarService.createCalendarEvent(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.project(projectId) });
      toast.success('Event created');
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, eventId, data }) => calendarService.updateCalendarEvent(projectId, eventId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.project(projectId) });
      toast.success('Event updated');
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, eventId }) => calendarService.deleteCalendarEvent(projectId, eventId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.project(projectId) });
      toast.success('Event deleted');
    },
  });
}
