import { useAuth } from '../context/AuthContext';

export function useRolePermissions() {
  const { user } = useAuth();
  const role = user?.role || '';

  return {
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isEmployee: role === 'employee',
    canCreateTask: role === 'admin' || role === 'manager',
    canEditTask: role === 'admin' || role === 'manager',
    canDeleteTask: role === 'admin',
    canAssignTask: role === 'admin' || role === 'manager',
    canApprove: role === 'admin' || role === 'manager',
    canViewAllTasks: role === 'admin' || role === 'manager',
    canManage: role === 'admin' || role === 'manager',
    canAccessAdminPage: role === 'admin',
  };
}
