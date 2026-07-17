export const mockAuth = {
  user: { id: 1, email: "admin@technova.com", name: "TechNova Admin", role: "admin", subscription_role: "admin", tenant_id: 1, avatar_url: null, auth_provider: "email", is_active: true },
  tenant: { id: 1, name: "TechNova Solutions Pvt Ltd", slug: "technova-solutions", logo: null, subscription_plan: "free", is_active: true },
  access_token: "mock_token_technova_admin",
  refresh_token: "mock_refresh_technova_admin",
  token_type: "bearer",
};

export const mockTenants = [
  { id: 1, name: "TechNova Solutions Pvt Ltd", slug: "technova-solutions", contact_email: "admin@technova.com", phone: "+91-9876543210", address: "Bengaluru, India", industry: "Technology", status: "ACTIVE", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-07-17T00:00:00Z" },
];

export const mockWorkspaces = [
  { id: 1, tenant_id: 1, name: "Engineering Workspace", slug: "technova-engineering", description: "Primary Engineering Workspace for Enterprise Flow SaaS Development", visibility: "PUBLIC", created_by: 1, is_archived: false, member_count: 12, status: "active", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-07-17T00:00:00Z" },
];

export const mockTeams = [
  { id: 1, tenant_id: 1, workspace_id: 1, name: "Backend Team", description: "Backend development team responsible for API and server-side logic", created_by: 1, is_archived: false, member_count: 4, lead: "Rahul Sharma", created_at: "2026-01-20T00:00:00Z", updated_at: "2026-07-17T00:00:00Z" },
  { id: 2, tenant_id: 1, workspace_id: 1, name: "Frontend Team", description: "Frontend development team handling UI/UX and client-side features", created_by: 1, is_archived: false, member_count: 3, lead: "Priya Patel", created_at: "2026-01-20T00:00:00Z", updated_at: "2026-07-17T00:00:00Z" },
  { id: 3, tenant_id: 1, workspace_id: 1, name: "QA Team", description: "Quality assurance team responsible for testing and validation", created_by: 1, is_archived: false, member_count: 3, lead: "Amit Kumar", created_at: "2026-01-20T00:00:00Z", updated_at: "2026-07-17T00:00:00Z" },
  { id: 4, tenant_id: 1, workspace_id: 1, name: "DevOps Team", description: "DevOps team managing CI/CD, infrastructure, and deployments", created_by: 1, is_archived: false, member_count: 2, lead: "Sneha Reddy", created_at: "2026-01-20T00:00:00Z", updated_at: "2026-07-17T00:00:00Z" },
];

export const mockProjects = [
  { id: 1, tenant_id: 1, workspace_id: 1, name: "Enterprise Flow SaaS Development", description: "Enterprise workflow SaaS platform with approval flows, document management, and team collaboration features", status: "ACTIVE", priority: "HIGH", start_date: "2026-02-01T00:00:00Z", due_date: "2026-12-31T00:00:00Z", is_archived: false, created_by: 1, owner: { id: 1, name: "TechNova Admin" }, team_count: 4, task_count: 4, created_at: "2026-02-01T00:00:00Z", updated_at: "2026-07-17T00:00:00Z" },
];

export const mockProjectChannels = [
  { id: 1, project_id: 1, name: "backend", description: "Backend development discussions and API updates", type: "Project", channel_type: "PROJECT", member_count: 4, last_activity: "2026-07-16T14:30:00Z", created_by: 1, created_at: "2026-02-01T00:00:00Z", is_archived: false },
  { id: 2, project_id: 1, name: "frontend", description: "Frontend UI/UX discussions and component updates", type: "Project", channel_type: "PROJECT", member_count: 3, last_activity: "2026-07-16T15:00:00Z", created_by: 1, created_at: "2026-02-01T00:00:00Z", is_archived: false },
  { id: 3, project_id: 1, name: "testing", description: "QA testing updates, bug reports, and test results", type: "Project", channel_type: "PROJECT", member_count: 3, last_activity: "2026-07-15T11:00:00Z", created_by: 1, created_at: "2026-02-01T00:00:00Z", is_archived: false },
  { id: 4, project_id: 1, name: "deployment", description: "Deployment notifications, CI/CD pipeline updates", type: "Project", channel_type: "PROJECT", member_count: 2, last_activity: "2026-07-17T09:00:00Z", created_by: 1, created_at: "2026-02-01T00:00:00Z", is_archived: false },
];

export const mockTasks = [
  { id: 1, project_id: 1, team_id: 1, title: "Implement Login API", description: "Build JWT-based authentication endpoints with refresh token support", status: "in_progress", priority: "high", due_date: "2026-08-01T00:00:00Z", created_by: 1, assigned_to: { id: 2, name: "Rahul Sharma" }, team: { id: 1, name: "Backend Team" }, progress: 65, created_at: "2026-07-01T00:00:00Z" },
  { id: 2, project_id: 1, team_id: 2, title: "Create Dashboard UI", description: "Design and implement the main analytics dashboard with charts and metrics", status: "todo", priority: "high", due_date: "2026-08-15T00:00:00Z", created_by: 1, assigned_to: { id: 3, name: "Priya Patel" }, team: { id: 2, name: "Frontend Team" }, progress: 0, created_at: "2026-07-01T00:00:00Z" },
  { id: 3, project_id: 1, team_id: 3, title: "Test Approval Workflow", description: "Write comprehensive test cases for the approval workflow module", status: "todo", priority: "medium", due_date: "2026-08-20T00:00:00Z", created_by: 1, assigned_to: { id: 4, name: "Amit Kumar" }, team: { id: 3, name: "QA Team" }, progress: 0, created_at: "2026-07-01T00:00:00Z" },
  { id: 4, project_id: 1, team_id: 4, title: "Deploy Release Build", description: "Configure and execute production deployment pipeline with rollback support", status: "todo", priority: "critical", due_date: "2026-09-01T00:00:00Z", created_by: 1, assigned_to: { id: 5, name: "Sneha Reddy" }, team: { id: 4, name: "DevOps Team" }, progress: 0, created_at: "2026-07-01T00:00:00Z" },
];

export const mockMeetings = [
  { id: 1, project_id: 1, title: "Sprint Planning", description: "Plan and assign sprint backlog items for the upcoming two-week sprint", date: "2026-07-20", start_time: "10:00", end_time: "11:30", duration: 90, location: "Conference Room A", meeting_link: "https://meet.technova.com/sprint-planning", status: "SCHEDULED", created_by: 1, organizer: "TechNova Admin", organizer_name: "TechNova Admin", attendee_count: 8, created_at: "2026-07-17T00:00:00Z" },
  { id: 2, project_id: 1, title: "Daily Standup", description: "Daily team sync to discuss progress, blockers, and plans", date: "2026-07-18", start_time: "09:00", end_time: "09:15", duration: 15, location: "Virtual", meeting_link: "https://meet.technova.com/daily-standup", status: "SCHEDULED", created_by: 1, organizer: "TechNova Admin", organizer_name: "TechNova Admin", attendee_count: 12, created_at: "2026-07-17T00:00:00Z" },
  { id: 3, project_id: 1, title: "Sprint Review", description: "Review completed work items and demonstrate new features to stakeholders", date: "2026-08-01", start_time: "14:00", end_time: "15:30", duration: 90, location: "Conference Room B", meeting_link: "https://meet.technova.com/sprint-review", status: "SCHEDULED", created_by: 1, organizer: "TechNova Admin", organizer_name: "TechNova Admin", attendee_count: 10, created_at: "2026-07-17T00:00:00Z" },
  { id: 4, project_id: 1, title: "Client Demo", description: "Quarterly product demo for Enterprise Flow SaaS clients showcasing new features", date: "2026-08-15", start_time: "11:00", end_time: "12:00", duration: 60, location: "Virtual", meeting_link: "https://meet.technova.com/client-demo", status: "SCHEDULED", created_by: 1, organizer: "TechNova Admin", organizer_name: "TechNova Admin", attendee_count: 25, created_at: "2026-07-17T00:00:00Z" },
];

export const mockDocuments = [
  { id: 1, project_id: 1, file_name: "Requirement Specification.pdf", file_path: "uploads/projects/1/Requirement Specification.pdf", file_size: 2450000, mime_type: "application/pdf", document_type: "REQUIREMENT", uploaded_by: 1, uploaded_by_name: "TechNova Admin", created_at: "2026-06-01T00:00:00Z", size: "2.4 MB" },
  { id: 2, project_id: 1, file_name: "API Contract.docx", file_path: "uploads/projects/1/API Contract.docx", file_size: 890000, mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", document_type: "DESIGN", uploaded_by: 1, uploaded_by_name: "TechNova Admin", created_at: "2026-06-15T00:00:00Z", size: "890 KB" },
  { id: 3, project_id: 1, file_name: "Deployment Guide.pdf", file_path: "uploads/projects/1/Deployment Guide.pdf", file_size: 1200000, mime_type: "application/pdf", document_type: "OTHER", uploaded_by: 1, uploaded_by_name: "Sneha Reddy", created_at: "2026-07-01T00:00:00Z", size: "1.2 MB" },
  { id: 4, project_id: 1, file_name: "Test Plan.xlsx", file_path: "uploads/projects/1/Test Plan.xlsx", file_size: 560000, mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", document_type: "TEST", uploaded_by: 1, uploaded_by_name: "Amit Kumar", created_at: "2026-07-10T00:00:00Z", size: "560 KB" },
];

export const mockWorkflows = [
  {
    id: 1, name: "Task Overdue Notification", description: "Auto-notify team lead and project manager when a task is overdue by 2 days", entity_type: "TASK", trigger_event: "task_overdue", status: "active", created_at: "2026-06-01T00:00:00Z", updated_at: "2026-07-17T00:00:00Z",
    rules: [
      { id: 1, name: "2-Day Overdue Rule", is_active: true, priority: 1, condition_config: { field: "overdue_days", operator: ">=", value: 2 }, action_config: { notify: ["team_lead", "project_manager"], channel: "email_and_in_app" } },
      { id: 2, name: "Escalation Rule", is_active: true, priority: 2, condition_config: { field: "overdue_days", operator: ">=", value: 5 }, action_config: { notify: ["engineering_head"], escalate: true } },
    ],
  },
  {
    id: 2, name: "Approval Reminder", description: "Send reminder for pending approval requests older than 3 days", entity_type: "APPROVAL", trigger_event: "approval_pending", status: "active", created_at: "2026-06-15T00:00:00Z", updated_at: "2026-07-17T00:00:00Z",
    rules: [
      { id: 3, name: "3-Day Pending Rule", is_active: true, priority: 1, condition_config: { field: "pending_days", operator: ">=", value: 3 }, action_config: { notify: ["approver", "requester"], channel: "email" } },
    ],
  },
  {
    id: 3, name: "Project Status Update", description: "Notify stakeholders on project status changes", entity_type: "PROJECT", trigger_event: "status_changed", status: "inactive", created_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-17T00:00:00Z",
    rules: [
      { id: 4, name: "Status Change Notification", is_active: false, priority: 1, condition_config: { field: "new_status", operator: "in", value: ["COMPLETED", "ON_HOLD", "CANCELLED"] }, action_config: { notify: ["all_team_members", "stakeholders"], channel: "in_app" } },
    ],
  },
];

export const mockSearchResults = {
  total: 5,
  groups: [
    {
      entity_type: "tasks", count: 1,
      results: [{ entity_type: "tasks", id: 1, title: "Implement Login API", description: "Build JWT-based authentication endpoints with refresh token support", url: "/tasks/1" }],
    },
    {
      entity_type: "documents", count: 1,
      results: [{ entity_type: "documents", id: 2, title: "API Contract.docx", description: "API contract document defining all REST endpoints and authentication flows", url: "/documents/2" }],
    },
    {
      entity_type: "messages", count: 1,
      results: [{ entity_type: "messages", id: 1, title: "Channel: #backend — Authentication API design discussion", description: "Discussion thread about JWT token format and refresh token strategy", url: "/channels/1" }],
    },
    {
      entity_type: "projects", count: 1,
      results: [{ entity_type: "projects", id: 1, title: "Enterprise Flow SaaS Development", description: "Enterprise workflow SaaS platform — Authentication API is a core component", url: "/projects/1" }],
    },
    {
      entity_type: "meetings", count: 1,
      results: [{ entity_type: "meetings", id: 3, title: "Sprint Review — Authentication API Demo", description: "Meeting notes from Sprint Review discussing the Authentication API implementation progress", url: "/projects/1/meetings" }],
    },
  ],
};

export const mockAnalyticsTasks = {
  total: 30, completed: 22, pending: 6, overdue: 2,
  by_status: [
    { status: "Completed", count: 22 },
    { status: "In Progress", count: 4 },
    { status: "Pending", count: 2 },
    { status: "Overdue", count: 2 },
  ],
  by_priority: [
    { priority: "Critical", count: 3 },
    { priority: "High", count: 8 },
    { priority: "Medium", count: 12 },
    { priority: "Low", count: 7 },
  ],
};

export const mockAnalyticsTeams = {
  total: 4, total_members: 12, avg_team_size: 3,
  teams: [
    { name: "Backend Team", member_count: 4 },
    { name: "Frontend Team", member_count: 3 },
    { name: "QA Team", member_count: 3 },
    { name: "DevOps Team", member_count: 2 },
  ],
};

export const mockAnalyticsProjects = {
  total: 1, overdue: 0, near_deadline: 1,
  by_status: [
    { status: "Active", count: 1 },
  ],
};

export const mockAnalyticsApprovals = {
  total: 8, pending: 3, delayed: 1,
  by_status: [
    { status: "Approved", count: 4 },
    { status: "Pending", count: 3 },
    { status: "Rejected", count: 1 },
  ],
  pending_by_level: [
    { status: "Level 1", count: 2 },
    { status: "Level 2", count: 1 },
  ],
};

export const mockAnalyticsDocuments = {
  total: 24, recent_uploads: 5, total_versions: 12,
  by_uploader: [
    { user_name: "TechNova Admin", count: 10 },
    { user_name: "Rahul Sharma", count: 6 },
    { user_name: "Priya Patel", count: 4 },
    { user_name: "Amit Kumar", count: 3 },
    { user_name: "Sneha Reddy", count: 1 },
  ],
};

export const mockKnowledgeCategories = [
  { id: 1, name: "Development Standards" },
  { id: 2, name: "DevOps & Deployment" },
  { id: 3, name: "API Documentation" },
  { id: 4, name: "Team Processes" },
];

export const mockKnowledgeArticles = [
  { id: 1, title: "API Coding Standards", content: "# API Coding Standards\n\n## Naming Conventions\n- Use descriptive resource names (plural): `/users`, `/projects`, `/tasks`\n- Use kebab-case for URL paths: `/project-settings`\n- Use snake_case for request/response fields: `user_id`, `created_at`\n\n## Authentication\n- All API endpoints (except auth) require JWT Bearer token in Authorization header\n- Tokens expire after 24 hours\n- Use refresh tokens to obtain new access tokens\n\n## Error Responses\n```json\n{\n  \"detail\": \"Human-readable error message\",\n  \"status_code\": 400\n}\n```\n\n## Versioning\n- API version is prefixed in URL path: `/api/v1/`\n- Breaking changes require a new version\n- Backward-compatible additions are allowed within the same version", category_id: 1, status: "published", author_id: 1, view_count: 245, version: 3, tags: "api,standards,backend,coding", updated_at: "2026-07-10T09:00:00Z" },
  { id: 2, title: "Deployment Checklist", content: "# Deployment Checklist\n\n## Pre-Deployment\n- [ ] All tests pass in CI pipeline\n- [ ] Code review approved by at least 2 peers\n- [ ] Feature flags configured for new features\n- [ ] Database migrations reviewed and tested\n- [ ] Release notes updated\n\n## Deployment Steps\n1. Merge feature branch to `staging`\n2. Run integration tests on staging environment\n3. Deploy to staging and verify smoke tests\n4. Get QA sign-off\n5. Merge to `main` branch\n6. Tag release with semantic version (v{major}.{minor}.{patch})\n7. Deploy to production (rolling update, 20% at a time)\n\n## Post-Deployment\n- [ ] Monitor error rates for 30 minutes\n- [ ] Verify critical user flows\n- [ ] Update deployment status in project channel\n- [ ] Notify stakeholders", category_id: 2, status: "published", author_id: 1, view_count: 189, version: 5, tags: "deployment,devops,checklist,release", updated_at: "2026-07-12T14:00:00Z" },
  { id: 3, title: "Git Branching Rules", content: "# Git Branching Rules\n\n## Branch Naming\n- `main` — Production-ready code\n- `staging` — Pre-production testing\n- `feature/{ticket-id}-{short-description}` — New features\n- `bugfix/{ticket-id}-{short-description}` — Bug fixes\n- `hotfix/{ticket-id}-{short-description}` — Urgent production fixes\n\n## Workflow\n1. Create feature branch from `staging`\n2. Make changes and commit with conventional commits\n3. Push and create PR to `staging`\n4. After review and CI passes, squash-merge to `staging`\n5. Release branch cut from `staging` to `main`\n\n## Commit Messages\nFormat: `type(scope): description`\n- `feat`: New feature\n- `fix`: Bug fix\n- `docs`: Documentation\n- `refactor`: Code restructuring\n- `test`: Adding tests\n- `chore`: Maintenance\n\n## No Direct Pushes\n- Direct pushes to `main` and `staging` are blocked\n- All changes must go through PR review\n- Minimum 1 approval required for feature branches\n- Minimum 2 approvals for release branches", category_id: 1, status: "published", author_id: 1, view_count: 312, version: 2, tags: "git,branching,workflow,version-control", updated_at: "2026-07-05T11:00:00Z" },
  { id: 4, title: "Sprint Planning Process", content: "# Sprint Planning Process\n\n## Cadence\n- 2-week sprints\n- Sprint Planning: Monday of Week 1, 2 hours\n- Daily Standup: 15 minutes at 9:00 AM\n- Sprint Review: Last Friday of Sprint, 1.5 hours\n- Retrospective: After Sprint Review, 1 hour\n\n## Capacity Planning\n- Each developer: 5 story points per day\n- Leave/buffer: 20% of total capacity\n- Bug fixes: 15% of sprint capacity\n\n## Definition of Done\n- Code written and committed\n- Unit tests passing (>80% coverage)\n- Integration tests passing\n- Code reviewed and approved\n- QA verified\n- Documentation updated\n- Deployed to staging", category_id: 4, status: "published", author_id: 1, view_count: 156, version: 4, tags: "sprint,agile,planning,process", updated_at: "2026-07-08T08:00:00Z" },
  { id: 5, title: "API Rate Limiting Policy", content: "# API Rate Limiting Policy\n\n## Limits\n- Unauthenticated: 10 requests/minute\n- Authenticated (free tier): 60 requests/minute\n- Enterprise tier: 600 requests/minute\n\n## Headers\n- `X-RateLimit-Limit`: Max requests per window\n- `X-RateLimit-Remaining`: Remaining requests in current window\n- `X-RateLimit-Reset`: Unix timestamp when window resets\n\n## Response on Exceed\n- Status: `429 Too Many Requests`\n- Retry-After header with seconds to wait", category_id: 3, status: "published", author_id: 1, view_count: 98, version: 1, tags: "api,rate-limiting,security", updated_at: "2026-07-15T16:00:00Z" },
];

const urlPatterns = [
  { pattern: /^\/auth\/login/, method: 'post', handler: () => ({ data: { ...mockAuth } }) },
  { pattern: /^\/auth\/me/, method: 'get', handler: () => ({ data: mockAuth.user }) },
  { pattern: /^\/auth\/refresh/, method: 'post', handler: () => ({ data: { access_token: mockAuth.access_token, refresh_token: mockAuth.refresh_token } }) },

  { pattern: /^\/tenants\/\d+$/, method: 'get', handler: () => ({ data: mockTenants[0] }) },
  { pattern: /^\/tenants$/, method: 'get', handler: () => ({ data: { items: mockTenants, total: 1, total_pages: 1 } }) },

  { pattern: /^\/workspaces\/\d+$/, method: 'get', handler: () => ({ data: mockWorkspaces[0] }) },
  { pattern: /^\/workspaces$/, method: 'get', handler: () => ({ data: { workspaces: mockWorkspaces } }) },

  { pattern: /^\/teams\/\d+$/, method: 'get', handler: (url) => ({ data: mockTeams.find(t => url.includes(`/teams/${t.id}`)) || mockTeams[0] }) },
  { pattern: /^\/teams$/, method: 'get', handler: () => ({ data: mockTeams }) },
  { pattern: /^\/workspaces\/\d+\/teams$/, method: 'get', handler: () => ({ data: mockTeams }) },

  { pattern: /^\/projects\/\d+$/, method: 'get', handler: () => ({ data: mockProjects[0] }) },
  { pattern: /^\/projects$/, method: 'get', handler: () => ({ data: mockProjects }) },
  { pattern: /^\/projects\/\d+\/teams$/, method: 'get', handler: () => ({ data: mockTeams }) },
  { pattern: /^\/projects\/\d+\/channels$/, method: 'get', handler: () => ({ data: mockProjectChannels }) },
  { pattern: /^\/projects\/\d+\/tasks$/, method: 'get', handler: () => ({ data: mockTasks }) },
  { pattern: /^\/projects\/\d+\/documents$/, method: 'get', handler: () => ({ data: mockDocuments }) },
  { pattern: /^\/projects\/\d+\/activity$/, method: 'get', handler: () => ({ data: [] }) },

  { pattern: /^\/meetings$/, method: 'get', handler: () => ({ data: mockMeetings }) },
  { pattern: /^\/meetings\/\d+$/, method: 'get', handler: () => ({ data: mockMeetings[0] }) },
  { pattern: /^\/projects\/\d+\/meetings$/, method: 'get', handler: () => ({ data: mockMeetings }) },

  { pattern: /^\/documents$/, method: 'get', handler: () => ({ data: mockDocuments }) },
  { pattern: /^\/channels$/, method: 'get', handler: () => ({ data: mockProjectChannels }) },
  { pattern: /^\/channels\/\d+$/, method: 'get', handler: () => ({ data: mockProjectChannels[0] }) },
  { pattern: /^\/tasks$/, method: 'get', handler: () => ({ data: mockTasks }) },
  { pattern: /^\/tasks\/\d+$/, method: 'get', handler: () => ({ data: mockTasks[0] }) },
  { pattern: /^\/organization$/, method: 'get', handler: () => ({ data: { name: "TechNova Solutions Pvt Ltd", employees: 25, departments: ["Engineering", "Sales", "HR", "Finance"] } }) },

  // Workflow Automation
  { pattern: /^\/workflows\/\d+\/rules\/\d+$/, method: 'delete', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/workflows\/\d+\/rules$/, method: 'get', handler: (url) => {
    const id = parseInt(url.match(/\/workflows\/(\d+)\/rules/)[1]);
    const wf = mockWorkflows.find(w => w.id === id);
    return { data: wf ? wf.rules : [] };
  }},
  { pattern: /^\/workflows\/\d+\/rules$/, method: 'post', handler: () => ({ data: { id: 99, name: "New Rule", is_active: true, priority: 1, condition_config: {}, action_config: {} } }) },
  { pattern: /^\/workflows\/rules\/\d+$/, method: 'put', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/workflows\/\d+\/executions$/, method: 'get', handler: () => ({ data: { items: [], total_pages: 0 } }) },
  { pattern: /^\/workflows\/\d+$/, method: 'put', handler: (url, config) => {
    const body = JSON.parse(config?.data || '{}');
    const id = parseInt(url.match(/\/workflows\/(\d+)/)[1]);
    const wf = mockWorkflows.find(w => w.id === id);
    if (body && body.status) return { data: { ...wf, status: body.status } };
    return { data: wf };
  }},
  { pattern: /^\/workflows\/\d+$/, method: 'delete', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/workflows$/, method: 'get', handler: () => ({ data: { items: mockWorkflows, data: mockWorkflows } }) },
  { pattern: /^\/workflows$/, method: 'post', handler: (url, config) => {
    const body = JSON.parse(config?.data || '{}');
    return { data: { id: 99, ...body, status: 'active', rules: [], created_at: new Date().toISOString() } };
  }},

  // Global Search
  { pattern: /^\/search$/, method: 'get', handler: (url, config) => {
    const q = config?.params?.q || '';
    if (q.toLowerCase().includes('authentication') || q.toLowerCase().includes('api')) {
      return { data: mockSearchResults };
    }
    return { data: { total: mockSearchResults.total, groups: mockSearchResults.groups } };
  }},

  // Saved Searches
  { pattern: /^\/saved-searches\/\d+$/, method: 'delete', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/saved-searches$/, method: 'get', handler: () => ({ data: { items: [
    { id: 1, name: "Authentication API Results", query: { q: "Authentication API", entity_types: [] }, created_at: "2026-07-15T10:00:00Z" },
    { id: 2, name: "Overdue Tasks", query: { q: "overdue", entity_types: ["tasks"] }, created_at: "2026-07-14T08:00:00Z" },
  ]}})},
  { pattern: /^\/saved-searches$/, method: 'post', handler: () => ({ data: { id: 3, name: "New Search", query: { q: "", entity_types: [] }, created_at: new Date().toISOString() } })},

  // Analytics
  { pattern: /^\/analytics\/projects$/, method: 'get', handler: () => ({ data: mockAnalyticsProjects }) },
  { pattern: /^\/analytics\/teams$/, method: 'get', handler: () => ({ data: mockAnalyticsTeams }) },
  { pattern: /^\/analytics\/tasks$/, method: 'get', handler: () => ({ data: mockAnalyticsTasks }) },
  { pattern: /^\/analytics\/approvals$/, method: 'get', handler: () => ({ data: mockAnalyticsApprovals }) },
  { pattern: /^\/analytics\/documents$/, method: 'get', handler: () => ({ data: mockAnalyticsDocuments }) },

  // Knowledge Base (bare paths — used by platform service after prefix stripping)
  { pattern: /^\/knowledge-base\/categories\/\d+$/, method: 'put', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/knowledge-base\/categories\/\d+$/, method: 'delete', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/knowledge-base\/categories$/, method: 'get', handler: () => ({ data: { items: mockKnowledgeCategories, data: mockKnowledgeCategories } }) },
  { pattern: /^\/knowledge-base\/categories$/, method: 'post', handler: (url, config) => {
    const body = JSON.parse(config?.data || '{}');
    return { data: { id: 99, name: body.name || "New Category" } };
  }},
  { pattern: /^\/knowledge-base\/articles\/\d+$/, method: 'put', handler: (url, config) => {
    const id = parseInt(url.match(/\/knowledge-base\/articles\/(\d+)/)[1]);
    const body = JSON.parse(config?.data || '{}');
    const article = mockKnowledgeArticles.find(a => a.id === id);
    return { data: { ...article, ...body } };
  }},
  { pattern: /^\/knowledge-base\/articles\/\d+$/, method: 'delete', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/knowledge-base\/articles$/, method: 'get', handler: () => ({ data: { items: mockKnowledgeArticles, data: mockKnowledgeArticles, total: mockKnowledgeArticles.length } }) },
  { pattern: /^\/knowledge-base\/articles$/, method: 'post', handler: (url, config) => {
    const body = JSON.parse(config?.data || '{}');
    return { data: { id: 99, ...body, status: 'draft', view_count: 0, version: 1, author_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } };
  }},
  // KB bare paths (platform service uses /knowledge-base not /knowledge-base/articles)
  { pattern: /^\/knowledge-base\/\d+$/, method: 'put', handler: (url, config) => {
    const id = parseInt(url.match(/\/knowledge-base\/(\d+)/)[1]);
    const body = JSON.parse(config?.data || '{}');
    const article = mockKnowledgeArticles.find(a => a.id === id);
    return { data: { ...article, ...body } };
  }},
  { pattern: /^\/knowledge-base\/\d+$/, method: 'delete', handler: () => ({ data: { success: true } }) },
  { pattern: /^\/knowledge-base$/, method: 'get', handler: () => ({ data: { items: mockKnowledgeArticles, data: mockKnowledgeArticles, total: mockKnowledgeArticles.length } }) },
  { pattern: /^\/knowledge-base$/, method: 'post', handler: (url, config) => {
    const body = JSON.parse(config?.data || '{}');
    return { data: { id: 99, ...body, status: 'draft', view_count: 0, version: 1, author_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } };
  }},
];

export function matchMock(method, url, config) {
  let cleanUrl = url.split('?')[0];
  for (const entry of urlPatterns) {
    if (entry.pattern.test(cleanUrl) && entry.method === method) {
      return entry.handler(url, config);
    }
  }
  if (cleanUrl.startsWith('/api/platform')) {
    const stripped = cleanUrl.slice('/api/platform'.length) || '/';
    for (const entry of urlPatterns) {
      if (entry.pattern.test(stripped) && entry.method === method) {
        return entry.handler(url, config);
      }
    }
  }
  return null;
}
