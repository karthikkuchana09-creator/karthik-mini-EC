import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tokenService } from '../../services/tokenService';
import { canAccessRoute, getRouteDenialReason } from '../../config/permissions';
import PageLoading from '../ui/PageLoading';
import { FiShield } from 'react-icons/fi';

function ProtectedRoute({ children, allowedRoles, requiredPermissions }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoading message="Verifying session..." />;
  }

  const token = tokenService.getAccessToken();
  if (!isAuthenticated || !token || tokenService.isTokenExpired(token)) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles || requiredPermissions) {
    const hasAccess = canAccessRoute(user, location.pathname);
    const explicitRoleCheck = !allowedRoles || allowedRoles.includes(user?.role);
    const explicitPermCheck = !requiredPermissions ||
      requiredPermissions.every((p) => {
        const perms = {
          admin: true, manager: true, employee: false, auditor: false,
        };
        return perms[user?.role] ?? false;
      });

    if (!hasAccess || !explicitRoleCheck || !explicitPermCheck) {
      const reason = getRouteDenialReason(user, location.pathname);
      return <Navigate to="/unauthorized" state={{ reason, from: location.pathname, role: user?.role }} replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
