import { useAuth } from '../context/AuthContext';

function RoleGuard({ children, allowedRoles, fallback = null }) {
  const { user } = useAuth();
  if (!user) return fallback;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return fallback;
  }
  return children;
}

export function useRoleCheck() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isEmployee: role === 'employee',
    isAdminOrManager: role === 'admin' || role === 'manager',
    hasRole: (...roles) => roles.includes(role),
  };
}

export default RoleGuard;
