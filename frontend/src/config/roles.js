export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.MANAGER]: 2,
  [ROLES.EMPLOYEE]: 1,
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.EMPLOYEE]: 'Employee',
};

export const ROLE_COLORS = {
  [ROLES.ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ROLES.MANAGER]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ROLES.EMPLOYEE]: 'bg-green-100 text-green-800 border-green-200',
};

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
  },
};

export function hasPermission(user, permission) {
  if (!user?.role) return false;
  return PERMISSIONS[user.role]?.[permission] ?? false;
}

export function hasRole(user, ...roles) {
  if (!user?.role) return false;
  return roles.includes(user.role);
}
