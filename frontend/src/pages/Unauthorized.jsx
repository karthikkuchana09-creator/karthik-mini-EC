import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS } from '../config/roles';
import { FiShield, FiArrowLeft, FiMail, FiAlertTriangle } from 'react-icons/fi';

export default function Unauthorized() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const reason = location.state?.reason;
  const attemptedPath = location.state?.from;
  const userRole = location.state?.role || user?.role;

  const roleLabel = ROLE_LABELS[userRole] || userRole || 'Unknown';
  const roleColor = ROLE_COLORS[userRole] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-red-500 h-2" />

          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
              <FiShield className="w-10 h-10 text-red-500" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">403</h1>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-500 mb-6">
              You don't have permission to access this resource.
            </p>

            {user && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Role</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor}`}>
                    <FiShield className="w-3 h-3 mr-1" />
                    {roleLabel}
                  </span>
                </div>
                {attemptedPath && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-xs">{attemptedPath}</span>
                  </div>
                )}
                {reason && (
                  <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-2.5">
                    <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all w-full sm:w-auto justify-center"
              >
                <FiArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all w-full sm:w-auto justify-center shadow-sm"
              >
                Dashboard
              </button>
              {user && (
                <button
                  onClick={() => logout()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all w-full sm:w-auto justify-center"
                >
                  Sign Out
                </button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Need access? Contact your administrator to request the appropriate permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
