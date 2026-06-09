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
const Approvals = lazy(() => import('../pages/Approvals'));
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
const WorkspaceDetail = lazy(() => import('../pages/workspace/WorkspaceDetail'));
const WorkspaceMembers = lazy(() => import('../pages/workspace/WorkspaceMembers'));
const Channels = lazy(() => import('../pages/channel/Channels'));
const ChannelDetail = lazy(() => import('../pages/channel/ChannelDetail'));

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
        <Route path="/workspaces/:id" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><WorkspaceDetail /></ProtectedRouteWrapper>} />
        <Route path="/workspaces/:id/members" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager']}><WorkspaceMembers /></ProtectedRouteWrapper>} />
        <Route path="/channels" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><Channels /></ProtectedRouteWrapper>} />
        <Route path="/channels/:id" element={<ProtectedRouteWrapper allowedRoles={['admin', 'manager', 'employee']}><ChannelDetail /></ProtectedRouteWrapper>} />
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
