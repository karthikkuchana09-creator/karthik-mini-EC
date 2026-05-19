import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationsApi from '../api/notifications';

export const notificationKeys = {
  all: ['notifications'],
  list: (filters) => [...notificationKeys.all, 'list', filters],
  unreadCount: () => [...notificationKeys.all, 'unreadCount'],
  stats: () => [...notificationKeys.all, 'stats'],
};

export function useNotifications(filters) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => notificationsApi.getNotifications(filters),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 60000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
