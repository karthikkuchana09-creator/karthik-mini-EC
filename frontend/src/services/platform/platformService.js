import api from '../../api/axios';

const PLATFORM_BASE = '/api/platform';

export const PLATFORM_QUERY_KEYS = {
  workflows: 'platform-workflows',
  workflowDetail: (id) => ['platform-workflow', id],
  workflowExecutions: (id) => ['platform-workflow-executions', id],
  notificationRules: 'platform-notification-rules',
  notificationRuleDetail: (id) => ['platform-notification-rule', id],
  search: 'platform-search',
  analytics: 'platform-analytics',
  knowledgeBase: 'platform-knowledge-base',
  knowledgeArticle: (id) => ['platform-knowledge-article', id],
  knowledgeCategories: 'platform-knowledge-categories',
  customForms: 'platform-custom-forms',
  customFormDetail: (id) => ['platform-custom-form', id],
  formSubmissions: (id) => ['platform-form-submissions', id],
  reports: 'platform-reports',
  reportDetail: (id) => ['platform-report', id],
};

export const platformApi = {
  workflows: {
    list: (params) => api.get(`${PLATFORM_BASE}/workflows`, { params }),
    get: (id) => api.get(`${PLATFORM_BASE}/workflows/${id}`),
    create: (data) => api.post(`${PLATFORM_BASE}/workflows`, data),
    update: (id, data) => api.put(`${PLATFORM_BASE}/workflows/${id}`, data),
    delete: (id) => api.delete(`${PLATFORM_BASE}/workflows/${id}`),
    createRule: (id, data) => api.post(`${PLATFORM_BASE}/workflows/${id}/rules`, data),
    updateRule: (ruleId, data) => api.put(`${PLATFORM_BASE}/workflows/rules/${ruleId}`, data),
    deleteRule: (ruleId) => api.delete(`${PLATFORM_BASE}/workflows/rules/${ruleId}`),
    execute: (id, data) => api.post(`${PLATFORM_BASE}/workflows/${id}/execute`, data),
    executions: (id, params) => api.get(`${PLATFORM_BASE}/workflows/${id}/executions`, { params }),
  },

  notificationRules: {
    list: (params) => api.get(`${PLATFORM_BASE}/notification-rules`, { params }),
    get: (id) => api.get(`${PLATFORM_BASE}/notification-rules/${id}`),
    create: (data) => api.post(`${PLATFORM_BASE}/notification-rules`, data),
    update: (id, data) => api.put(`${PLATFORM_BASE}/notification-rules/${id}`, data),
    delete: (id) => api.delete(`${PLATFORM_BASE}/notification-rules/${id}`),
    toggle: (id) => api.patch(`${PLATFORM_BASE}/notification-rules/${id}/toggle`),
  },

  search: {
    global: (params) => api.get(`${PLATFORM_BASE}/search`, { params }),
    tasks: (params) => api.get(`${PLATFORM_BASE}/search/tasks`, { params }),
    projects: (params) => api.get(`${PLATFORM_BASE}/search/projects`, { params }),
    documents: (params) => api.get(`${PLATFORM_BASE}/search/documents`, { params }),
    messages: (params) => api.get(`${PLATFORM_BASE}/search/messages`, { params }),
    savedSearches: {
      list: (params) => api.get(`${PLATFORM_BASE}/saved-searches`, { params }),
      create: (data) => api.post(`${PLATFORM_BASE}/saved-searches`, data),
      delete: (id) => api.delete(`${PLATFORM_BASE}/saved-searches/${id}`),
    },
  },

  analytics: {
    projects: (params) => api.get(`${PLATFORM_BASE}/analytics/projects`, { params }),
    teams: (params) => api.get(`${PLATFORM_BASE}/analytics/teams`, { params }),
    tasks: (params) => api.get(`${PLATFORM_BASE}/analytics/tasks`, { params }),
    approvals: (params) => api.get(`${PLATFORM_BASE}/analytics/approvals`, { params }),
    documents: (params) => api.get(`${PLATFORM_BASE}/analytics/documents`, { params }),
  },

  knowledgeBase: {
    articles: {
      list: (params) => api.get(`${PLATFORM_BASE}/knowledge-base`, { params }),
      get: (id) => api.get(`${PLATFORM_BASE}/knowledge-base/${id}`),
      create: (data) => api.post(`${PLATFORM_BASE}/knowledge-base`, data),
      update: (id, data) => api.put(`${PLATFORM_BASE}/knowledge-base/${id}`, data),
      delete: (id) => api.delete(`${PLATFORM_BASE}/knowledge-base/${id}`),
    },
    categories: {
      list: (params) => api.get(`${PLATFORM_BASE}/knowledge-base/categories`, { params }),
      create: (data) => api.post(`${PLATFORM_BASE}/knowledge-base/categories`, data),
      update: (id, data) => api.put(`${PLATFORM_BASE}/knowledge-base/categories/${id}`, data),
      delete: (id) => api.delete(`${PLATFORM_BASE}/knowledge-base/categories/${id}`),
    },
  },

  customForms: {
    list: (params) => api.get(`${PLATFORM_BASE}/custom-forms`, { params }),
    get: (id) => api.get(`${PLATFORM_BASE}/custom-forms/${id}`),
    create: (data) => api.post(`${PLATFORM_BASE}/custom-forms`, data),
    update: (id, data) => api.put(`${PLATFORM_BASE}/custom-forms/${id}`, data),
    delete: (id) => api.delete(`${PLATFORM_BASE}/custom-forms/${id}`),
    submit: (id, data) => api.post(`${PLATFORM_BASE}/custom-forms/${id}/submit`, data),
    submissions: (id, params) => api.get(`${PLATFORM_BASE}/custom-forms/${id}/submissions`, { params }),
  },

  reports: {
    list: (params) => api.get(`${PLATFORM_BASE}/reports`, { params }),
    get: (id) => api.get(`${PLATFORM_BASE}/reports/${id}`),
    create: (data) => api.post(`${PLATFORM_BASE}/reports`, data),
    update: (id, data) => api.put(`${PLATFORM_BASE}/reports/${id}`, data),
    delete: (id) => api.delete(`${PLATFORM_BASE}/reports/${id}`),
    execute: (id, data) => api.post(`${PLATFORM_BASE}/reports/${id}/execute`, data),
    export: (id, format) => api.get(`${PLATFORM_BASE}/reports/${id}/export`, {
      params: { format },
      responseType: 'blob',
    }),
    projects: (params) => api.get(`${PLATFORM_BASE}/reports/projects`, { params }),
    tasks: (params) => api.get(`${PLATFORM_BASE}/reports/tasks`, { params }),
    approvals: (params) => api.get(`${PLATFORM_BASE}/reports/approvals`, { params }),
    documents: (params) => api.get(`${PLATFORM_BASE}/reports/documents`, { params }),
  },
};

export default platformApi;
