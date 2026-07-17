import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import platformApi, { PLATFORM_QUERY_KEYS } from '../../services/platform/platformService';
import toast from 'react-hot-toast';

function usePlatformQuery({ key, fn, params = {}, enabled = true, onError }) {
  return useQuery({
    queryKey: [key, params],
    queryFn: async () => {
      const response = await fn(params);
      return response.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    onError: (err) => {
      if (onError) onError(err);
    },
  });
}

function usePlatformMutation({ fn, queryKey, successMessage = 'Operation completed successfully' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables) => {
      const response = await fn(variables);
      return response.data;
    },
    onSuccess: () => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onError: (err) => {
      const message = err?.response?.data?.detail || err?.message || 'An unexpected error occurred';
      toast.error(message);
    },
  });
}

export function usePlatformWorkflows(params) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.workflows,
    fn: () => platformApi.workflows.list(params),
    params,
  });
}

export function usePlatformWorkflowDetail(id) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.workflowDetail(id),
    fn: () => platformApi.workflows.get(id),
    enabled: !!id,
  });
}

export function usePlatformNotificationRules(params) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.notificationRules,
    fn: () => platformApi.notificationRules.list(params),
    params,
  });
}

export function usePlatformKnowledgeBase(params) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.knowledgeBase,
    fn: () => platformApi.knowledgeBase.articles.list(params),
    params,
  });
}

export function usePlatformKnowledgeArticle(id) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.knowledgeArticle(id),
    fn: () => platformApi.knowledgeBase.articles.get(id),
    enabled: !!id,
  });
}

export function usePlatformCustomForms(params) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.customForms,
    fn: () => platformApi.customForms.list(params),
    params,
  });
}

export function usePlatformReports(params) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.reports,
    fn: () => platformApi.reports.list(params),
    params,
  });
}

export function usePlatformAnalytics(type, params) {
  const endpointMap = {
    projects: platformApi.analytics.projects,
    teams: platformApi.analytics.teams,
    tasks: platformApi.analytics.tasks,
    approvals: platformApi.analytics.approvals,
    documents: platformApi.analytics.documents,
  };

  return usePlatformQuery({
    key: [PLATFORM_QUERY_KEYS.analytics, type],
    fn: () => endpointMap[type](params),
    enabled: !!type && !!endpointMap[type],
    params,
  });
}

export function usePlatformSearch(params) {
  return usePlatformQuery({
    key: PLATFORM_QUERY_KEYS.search,
    fn: () => platformApi.search.global(params),
    params,
    enabled: !!params?.q,
  });
}

export { usePlatformQuery, usePlatformMutation };
