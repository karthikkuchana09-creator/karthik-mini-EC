import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getTaskDistribution } from '../api/dashboard';
import { getNotifications } from '../api/notifications';

export const dashboardKeys = {
  all: ['dashboard'],
  summary: () => [...dashboardKeys.all, 'summary'],
  distribution: () => [...dashboardKeys.all, 'distribution'],
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getDashboardSummary,
    staleTime: 1000 * 60,
  });
}

export function useTaskDistribution() {
  return useQuery({
    queryKey: dashboardKeys.distribution(),
    queryFn: () => getTaskDistribution().then(d => Array.isArray(d) ? d : []),
    staleTime: 1000 * 60,
  });
}

export function useDashboardNotifications(limit = 5) {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'notifications', limit],
    queryFn: () => getNotifications().then(data => {
      const list = Array.isArray(data) ? data : data.items || data.notifications || data.results || [];
      return list.slice(0, limit);
    }),
    staleTime: 1000 * 30,
  });
}
