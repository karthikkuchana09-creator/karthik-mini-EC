import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../config/permissions';

export default function PermissionGate({ permission, fallback = null, children }) {
  const { user } = useAuth();
  if (!user) return fallback;
  if (!hasPermission(user, permission)) return fallback;
  return children;
}
