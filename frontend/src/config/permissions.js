import { ROLES } from './roles';

export { ROLES, ROLE_HIERARCHY, ROLE_LABELS, ROLE_COLORS } from './roles';

export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    canCreateTask: true,
    canEditTask: true,
    canDeleteTask: true,
    canAssignTask: true,
    canApprove: true,
    canViewAllTasks: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canManageDocuments: true,
    canAccessAdmin: true,
    canManageSLA: true,
    canManageEscalations: true,
    canManageDelegations: true,
    canManageNotifications: true,
    canViewAnalytics: true,
  },
  [ROLES.MANAGER]: {
    canCreateTask: true,
    canEditTask: true,
    canDeleteTask: false,
    canAssignTask: true,
    canApprove: true,
    canViewAllTasks: true,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageDocuments: true,
    canAccessAdmin: false,
    canManageSLA: true,
    canManageEscalations: false,
    canManageDelegations: true,
    canManageNotifications: false,
    canViewAnalytics: true,
  },
  [ROLES.EMPLOYEE]: {
    canCreateTask: false,
    canEditTask: false,
    canDeleteTask: false,
    canAssignTask: false,
    canApprove: false,
    canViewAllTasks: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageDocuments: false,
    canAccessAdmin: false,
    canManageSLA: false,
    canManageEscalations: false,
    canManageDelegations: false,
    canManageNotifications: false,
    canViewAnalytics: false,
  },
  [ROLES.AUDITOR]: {
    canCreateTask: false,
    canEditTask: false,
    canDeleteTask: false,
    canAssignTask: false,
    canApprove: false,
    canViewAllTasks: true,
    canManageUsers: false,
    canViewAuditLogs: true,
    canManageDocuments: true,
    canAccessAdmin: false,
    canManageSLA: false,
    canManageEscalations: false,
    canManageDelegations: false,
    canManageNotifications: true,
    canViewAnalytics: true,
  },
};

export const ROUTE_PERMISSIONS = {
  '/dashboard': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/dashboard/sla': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: ['canManageSLA'] },
  '/sla-dashboard': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: ['canManageSLA'] },
  '/sla-rules': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: ['canManageSLA'] },
  '/tasks': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/tasks/create': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: ['canCreateTask'] },
  '/tasks/:id/edit': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], requiredPermissions: ['canEditTask'] },
  '/tasks/:id': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/kanban': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], requiredPermissions: [] },
  '/approvals': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: ['canApprove'] },
  '/approvals/escalations': { allowedRoles: [ROLES.ADMIN], requiredPermissions: ['canManageEscalations'] },
  '/approval-escalations': { allowedRoles: [ROLES.ADMIN], requiredPermissions: ['canManageEscalations'] },
  '/approvals/delegations': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: ['canManageDelegations'] },
  '/approval-delegations': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: ['canManageDelegations'] },
  '/audit-logs': { allowedRoles: [ROLES.ADMIN, ROLES.AUDITOR], requiredPermissions: ['canViewAuditLogs'] },
  '/admin/audit-logs': { allowedRoles: [ROLES.ADMIN, ROLES.AUDITOR], requiredPermissions: ['canViewAuditLogs'] },
  '/admin': { allowedRoles: [ROLES.ADMIN], requiredPermissions: ['canAccessAdmin'] },
  '/admin-dashboard': { allowedRoles: [ROLES.ADMIN], requiredPermissions: ['canAccessAdmin'] },
  '/admin-monitoring': { allowedRoles: [ROLES.ADMIN], requiredPermissions: ['canAccessAdmin'] },
  '/super-admin-dashboard': { allowedRoles: [ROLES.ADMIN], requiredPermissions: ['canAccessAdmin'] },
  '/manager-dashboard': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER], requiredPermissions: [] },
  '/documents': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/notifications': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/notifications/preferences': { allowedRoles: Object.values(ROLES), requiredPermissions: ['canManageNotifications'] },
  '/settings/notification-preferences': { allowedRoles: Object.values(ROLES), requiredPermissions: ['canManageNotifications'] },
  '/organization': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/pricing': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/credits': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/leave-application': { allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], requiredPermissions: [] },
  '/leave-status': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
  '/unauthorized': { allowedRoles: Object.values(ROLES), requiredPermissions: [] },
};

export function hasPermission(user, permission) {
  if (!user?.role) return false;
  const rolePermissions = PERMISSIONS[user.role];
  if (!rolePermissions) return false;
  return rolePermissions[permission] ?? false;
}

export function hasRole(user, ...roles) {
  if (!user?.role) return false;
  return roles.includes(user.role);
}

export function hasRequiredPermissions(user, requiredPermissions = []) {
  if (!requiredPermissions.length) return true;
  return requiredPermissions.every((p) => hasPermission(user, p));
}

export function canAccessRoute(user, path) {
  if (!user?.role) return false;

  const routeConfig = ROUTE_PERMISSIONS[path];
  if (!routeConfig) return true;

  const { allowedRoles, requiredPermissions } = routeConfig;
  const hasRoleAccess = !allowedRoles || allowedRoles.includes(user.role);
  const hasPermAccess = hasRequiredPermissions(user, requiredPermissions);

  return hasRoleAccess && hasPermAccess;
}

export function getRouteDenialReason(user, path) {
  if (!user) return 'Authentication required';
  if (!user.role) return 'No role assigned';

  const routeConfig = ROUTE_PERMISSIONS[path];
  if (!routeConfig) return null;

  const { allowedRoles, requiredPermissions } = routeConfig;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return `Access restricted to: ${allowedRoles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}`;
  }

  for (const perm of requiredPermissions) {
    if (!hasPermission(user, perm)) {
      return `You lack the required permission: ${perm.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}`;
    }
  }

  return null;
}
