import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { ProtectedRoute, ErrorBoundary } from '../components/guards';
import { SkeletonPage, Spinner } from '../components/ui';

const AuthPage = lazy(() => import('../pages/AuthPage'));
const GoogleCallback = lazy(() => import('../pages/GoogleCallback'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Kanban = lazy(() => import('../pages/Kanban'));
const Approvals = lazy(() => import('../pages/approvals/Approvals'));
const TaskList = lazy(() => import('../pages/TaskList'));
const CreateTask = lazy(() => import('../pages/CreateTask'));
const EditTask = lazy(() => import('../pages/EditTask'));
const TaskDetail = lazy(() => import('../pages/TaskDetail'));
const ApprovalHistory = lazy(() => import('../pages/ApprovalHistory'));
const Admin = lazy(() => import('../pages/Admin'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Documents = lazy(() => import('../pages/Documents'));
const AuditLogs = lazy(() => import('../pages/AuditLogs'));
const LeaveApplication = lazy(() => import('../pages/LeaveApplication'));
const LeaveStatus = lazy(() => import('../pages/LeaveStatus'));
const ManagerDashboard = lazy(() => import('../pages/ManagerDashboard'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard'));
const OrganizationManagement = lazy(() => import('../pages/OrganizationManagement'));
const PricingPage = lazy(() => import('../pages/PricingPage'));
const CreditDashboard = lazy(() => import('../pages/CreditDashboard'));
const AdminMonitoring = lazy(() => import('../pages/AdminMonitoring'));
const Unauthorized = lazy(() => import('../pages/Unauthorized'));

const SLARules = lazy(() => import('../pages/sla/SLARules'));
const SLADashboard = lazy(() => import('../pages/dashboard/SLADashboard'));
const ApprovalEscalations = lazy(() => import('../pages/approvals/ApprovalEscalations'));
const ApprovalDelegations = lazy(() => import('../pages/approvals/ApprovalDelegations'));
const TasksPage = lazy(() => import('../pages/tasks/Tasks'));
const TaskDetailsPage = lazy(() => import('../pages/tasks/TaskDetails'));
const Login = lazy(() => import('../pages/auth/Login'));
const NotificationPreferences = lazy(() => import('../pages/notifications/NotificationPreferences'));
const TeamIntelligence = lazy(() => import('../pages/TeamIntelligence'));
const EmployeeProductivity = lazy(() => import('../pages/EmployeeProductivity'));
const DelayRiskMonitor = lazy(() => import('../pages/DelayRiskMonitor'));
const AIAnalyticsDashboard = lazy(() => import('../pages/AIAnalyticsDashboard'));
const EmployeeApprovals = lazy(() => import('../pages/approvals/EmployeeApprovals'));
const TenantManagement = lazy(() => import('../pages/tenants/TenantManagement'));
const TenantOnboarding = lazy(() => import('../pages/tenants/TenantOnboarding'));
const TenantCollaborationSettings = lazy(() => import('../pages/tenants/TenantCollaborationSettings'));
const TenantUsageDashboard = lazy(() => import('../pages/tenants/TenantUsageDashboard'));
const SaaSDashboard = lazy(() => import('../pages/SaaSDashboard'));
const Workspaces = lazy(() => import('../pages/workspace/Workspaces'));
const WorkspaceMembers = lazy(() => import('../pages/workspace/WorkspaceMembers'));
const Channels = lazy(() => import('../pages/channel/Channels'));


// Phase 10B — Workspace & Channel Communication
const WorkspaceList = lazy(() => import('../pages/workspaces/WorkspaceList'));
const WorkspaceDetails = lazy(() => import('../pages/workspaces/WorkspaceDetails'));
const WorkspaceMessages = lazy(() => import('../pages/workspaces/WorkspaceMessages'));
const WorkspaceMsgTasks = lazy(() => import('../pages/workspaces/WorkspaceTasks'));
const WorkspaceMsgDocs = lazy(() => import('../pages/workspaces/WorkspaceDocuments'));
const WorkspaceMsgMembers = lazy(() => import('../pages/workspaces/WorkspaceMembers'));
const WorkspaceMsgChannels = lazy(() => import('../pages/workspaces/WorkspaceChannels'));
const ChannelDetails = lazy(() => import('../pages/channels/ChannelDetails'));
const ChannelMsg = lazy(() => import('../pages/channels/ChannelMessages'));
const ChannelMsgTasks = lazy(() => import('../pages/channels/ChannelTasks'));
const ChannelMsgDocs = lazy(() => import('../pages/channels/ChannelDocuments'));
  const WorkspaceTaskDetailPage = lazy(() => import('../pages/tasks/WorkspaceTaskDetails'));
  const ChannelTaskDetailPage = lazy(() => import('../pages/tasks/ChannelTaskDetails'));
  const TaskDocPage = lazy(() => import('../pages/tasks/TaskDocuments'));
  const ApprovalDocPage = lazy(() => import('../pages/approvals/ApprovalDocuments'));

// Phase 10C — Collaboration Hierarchy Extension
const Phase10CTeamsPage = lazy(() => import('../pages/phase10c/TeamsPage'));
const Phase10CTeamDetailPage = lazy(() => import('../pages/phase10c/TeamDetailPage'));
const Phase10CTeamWorkloadPage = lazy(() => import('../pages/phase10c/TeamWorkloadPage'));
const Phase10CProjectsPage = lazy(() => import('../pages/phase10c/Projects'));
const Phase10CProjectDetailPage = lazy(() => import('../pages/phase10c/ProjectDetailPage'));
const WorkspaceTeams = lazy(() => import('../pages/phase10c/Teams'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}

function RedirectIfAuthed({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function withErrorAndSuspense(Component) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SkeletonPage />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

function ProtectedRouteWrapper({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <ErrorBoundary>
        <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<RedirectIfAuthed><ErrorBoundary><Suspense fallback={<PageLoader />}><AuthPage /></Suspense></ErrorBoundary></RedirectIfAuthed>} />
      <Route path="/auth/google/callback" element={withErrorAndSuspense(GoogleCallback)} />
      <Route path="/unauthorized" element={<Suspense fallback={<PageLoader />}><Unauthorized /></Suspense>} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRouteWrapper><Dashboard /></ProtectedRouteWrapper>} />
        <Route path="/dashboard/sla" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><SLADashboard /></ProtectedRouteWrapper>} />
        <Route path="/sla-dashboard" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><SLADashboard /></ProtectedRouteWrapper>} />
        <Route path="/manager-dashboard" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><ManagerDashboard /></ProtectedRouteWrapper>} />
        <Route path="/admin-dashboard" element={<ProtectedRouteWrapper allowedRoles={['admin']}><AdminDashboard /></ProtectedRouteWrapper>} />
        <Route path="/super-admin-dashboard" element={<ProtectedRouteWrapper allowedRoles={['admin']}><SuperAdminDashboard /></ProtectedRouteWrapper>} />
        <Route path="/saas-dashboard" element={<ProtectedRouteWrapper allowedRoles={['admin']}><SaaSDashboard /></ProtectedRouteWrapper>} />
        <Route path="/kanban" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Kanban /></ProtectedRouteWrapper>} />
        <Route path="/tasks" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><TasksPage /></ProtectedRouteWrapper>} />
        <Route path="/tasks/create" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><CreateTask /></ProtectedRouteWrapper>} />
        <Route path="/tasks/:id/edit" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><EditTask /></ProtectedRouteWrapper>} />
        <Route path="/tasks/:id" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><TaskDetailsPage /></ProtectedRouteWrapper>} />
        <Route path="/tasks-v2" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><TasksPage /></ProtectedRouteWrapper>} />
        <Route path="/tasks-v2/:id" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><TaskDetailsPage /></ProtectedRouteWrapper>} />
        <Route path="/approvals" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><Approvals /></ProtectedRouteWrapper>} />
        <Route path="/my-approvals" element={<ProtectedRouteWrapper allowedRoles={['employee']}><EmployeeApprovals /></ProtectedRouteWrapper>} />
        <Route path="/approvals/:id/history" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><ApprovalHistory /></ProtectedRouteWrapper>} />
        <Route path="/approval-escalations" element={<ProtectedRouteWrapper allowedRoles={['admin']}><ApprovalEscalations /></ProtectedRouteWrapper>} />
        <Route path="/approvals/escalations" element={<ProtectedRouteWrapper allowedRoles={['admin']}><ApprovalEscalations /></ProtectedRouteWrapper>} />
        <Route path="/approval-delegations" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><ApprovalDelegations /></ProtectedRouteWrapper>} />
        <Route path="/approvals/delegations" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><ApprovalDelegations /></ProtectedRouteWrapper>} />
        <Route path="/documents" element={<ProtectedRouteWrapper><Documents /></ProtectedRouteWrapper>} />
        <Route path="/notifications" element={<ProtectedRouteWrapper><Notifications /></ProtectedRouteWrapper>} />
        <Route path="/notifications/preferences" element={<ProtectedRouteWrapper><NotificationPreferences /></ProtectedRouteWrapper>} />
        <Route path="/settings/notification-preferences" element={<ProtectedRouteWrapper><NotificationPreferences /></ProtectedRouteWrapper>} />
        <Route path="/audit-logs" element={<ProtectedRouteWrapper allowedRoles={['admin', 'auditor']}><AuditLogs /></ProtectedRouteWrapper>} />
        <Route path="/admin/audit-logs" element={<ProtectedRouteWrapper allowedRoles={['admin', 'auditor']}><AuditLogs /></ProtectedRouteWrapper>} />
        <Route path="/sla-rules" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><SLARules /></ProtectedRouteWrapper>} />
        <Route path="/admin" element={<ProtectedRouteWrapper allowedRoles={['admin']}><Admin /></ProtectedRouteWrapper>} />
        <Route path="/admin/tenants" element={<ProtectedRouteWrapper allowedRoles={['admin']}><TenantManagement /></ProtectedRouteWrapper>} />
        <Route path="/admin/tenants/onboarding" element={<ProtectedRouteWrapper allowedRoles={['admin']}><TenantOnboarding /></ProtectedRouteWrapper>} />
        <Route path="/admin/tenants/:id/settings" element={<ProtectedRouteWrapper allowedRoles={['admin']}><TenantCollaborationSettings /></ProtectedRouteWrapper>} />
        <Route path="/admin/tenants/:id/usage" element={<ProtectedRouteWrapper allowedRoles={['admin']}><TenantUsageDashboard /></ProtectedRouteWrapper>} />
        <Route path="/workspaces" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><Workspaces /></ProtectedRouteWrapper>} />
        <Route path="/workspaces/new" element={<Navigate to="/workspaces" replace />} />
        <Route path="/workspaces/:workspaceId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><WorkspaceDetails /></ProtectedRouteWrapper>} />
        <Route path="/workspaces/:workspaceId/tasks/:taskId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><WorkspaceTaskDetailPage /></ProtectedRouteWrapper>} />
        <Route path="/workspaces/:id/members" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><WorkspaceMembers /></ProtectedRouteWrapper>} />
        <Route path="/workspaces/:workspaceId/teams" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><WorkspaceTeams /></ProtectedRouteWrapper>} />
        <Route path="/channels" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Channels /></ProtectedRouteWrapper>} />
        <Route path="/channels/:channelId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelDetails /></ProtectedRouteWrapper>} />
        <Route path="/channels/:channelId/tasks/:taskId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelTaskDetailPage /></ProtectedRouteWrapper>} />

        {/* Phase 10B — Workspace & Channel Communication */}
        <Route path="/workspace-list" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><WorkspaceList /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:id" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><WorkspaceDetails /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:id/messages" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><WorkspaceMessages /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:id/tasks" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><WorkspaceMsgTasks /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:id/documents" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><WorkspaceMsgDocs /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:id/members" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><WorkspaceMsgMembers /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:id/channels" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><WorkspaceMsgChannels /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:workspaceId/tasks/:taskId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><WorkspaceTaskDetailPage /></ProtectedRouteWrapper>} />
        <Route path="/workspace-list/:workspaceId/tasks/:taskId/documents" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><TaskDocPage /></ProtectedRouteWrapper>} />
        <Route path="/channel-list/:id" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelDetails /></ProtectedRouteWrapper>} />
        <Route path="/channel-list/:id/messages" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelMsg /></ProtectedRouteWrapper>} />
        <Route path="/channel-list/:id/tasks" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelMsgTasks /></ProtectedRouteWrapper>} />
        <Route path="/channel-list/:id/documents" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelMsgDocs /></ProtectedRouteWrapper>} />
        <Route path="/channel-list/:channelId/tasks/:taskId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelTaskDetailPage /></ProtectedRouteWrapper>} />
        <Route path="/channel-list/:channelId/tasks/:taskId/documents" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><TaskDocPage /></ProtectedRouteWrapper>} />
        <Route path="/approvals/:approvalId/documents" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><ApprovalDocPage /></ProtectedRouteWrapper>} />

        {/* Phase 10C — Collaboration Hierarchy Extension */}
        <Route path="/teams" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Phase10CTeamsPage /></ProtectedRouteWrapper>} />
        <Route path="/teams/:teamId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Phase10CTeamDetailPage /></ProtectedRouteWrapper>} />
        <Route path="/teams/:teamId/workload" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Phase10CTeamWorkloadPage /></ProtectedRouteWrapper>} />
        <Route path="/projects" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Phase10CProjectsPage /></ProtectedRouteWrapper>} />
        <Route path="/projects/:projectId" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Phase10CProjectDetailPage /></ProtectedRouteWrapper>} />
        <Route path="/organization" element={<ProtectedRouteWrapper><OrganizationManagement /></ProtectedRouteWrapper>} />
        <Route path="/pricing" element={<ProtectedRouteWrapper><PricingPage /></ProtectedRouteWrapper>} />
        <Route path="/credits" element={<ProtectedRouteWrapper><CreditDashboard /></ProtectedRouteWrapper>} />
        <Route path="/admin-monitoring" element={<ProtectedRouteWrapper allowedRoles={['admin']}><AdminMonitoring /></ProtectedRouteWrapper>} />
        <Route path="/leaves/apply" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><LeaveApplication /></ProtectedRouteWrapper>} />
        <Route path="/ai-analytics" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><AIAnalyticsDashboard /></ProtectedRouteWrapper>} />
        <Route path="/team-intelligence" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><TeamIntelligence /></ProtectedRouteWrapper>} />
        <Route path="/employee-productivity" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><EmployeeProductivity /></ProtectedRouteWrapper>} />
        <Route path="/delay-risk-monitor" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><DelayRiskMonitor /></ProtectedRouteWrapper>} />
        <Route path="/login-v2" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      </Route>
    </Routes>
  );
}
