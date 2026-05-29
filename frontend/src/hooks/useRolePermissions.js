import { useAuth } from '../context/AuthContext';

export function useRolePermissions() {
  const { user } = useAuth();
  const role = user?.role || '';

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isAuditor = role === 'auditor';
  const isAdminOrManager = isAdmin || isManager;

  return {
    role,
    isAdmin,
    isManager,
    isEmployee,
    isAuditor,
    isAdminOrManager,

    canCreateTask: isAdminOrManager,
    canEditTask: isAdminOrManager,
    canDeleteTask: isAdmin,
    canAssignTask: isAdminOrManager,
    canApprove: isAdminOrManager,
    canViewAllTasks: isAdminOrManager,
    canManage: isAdminOrManager,
    canAccessAdminPage: isAdmin,

    canViewAIInsights: isAdminOrManager,
    canViewPersonalInsights: true,
    canViewAuditLogs: isAdmin || isAuditor,
    canViewTeamDocuments: isAdminOrManager,
    canUploadDocuments: true,
    canDownloadDocuments: true,
    canManageDocuments: isAdminOrManager,
    canViewActivityFeed: true,
    canReceiveNotifications: true,
  };
}
