import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDropdown from '../NotificationDropdown';
import {
  FiMenu,
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiUser,
  FiShield,
} from 'react-icons/fi';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/sla-dashboard': 'SLA Dashboard',
  '/sla-rules': 'SLA Rules',
  '/tasks': 'Tasks',
  '/tasks/create': 'Create Task',
  '/kanban': 'Kanban Board',
  '/approvals': 'Approvals',
  '/approvals/escalations': 'Approval Escalations',
  '/approvals/delegations': 'Approval Delegations',
  '/notifications': 'Notifications',
  '/notifications/preferences': 'Notification Preferences',
  '/documents': 'Documents',
  '/audit-logs': 'Audit Logs',
  '/admin/audit-logs': 'Audit Logs',
  '/credits': 'Credits & Usage',
  '/pricing': 'Pricing & Plans',
  '/organization': 'Organization',
  '/admin': 'User Management',
  '/admin-dashboard': 'Admin Dashboard',
  '/admin-monitoring': 'System Monitoring',
  '/super-admin-dashboard': 'Super Admin',
  '/manager-dashboard': 'Manager Dashboard',
  '/leave-application': 'Leave Application',
  '/leave-status': 'Leave Status',
  '/ai-analytics': 'AI Analytics',
  '/delay-risk-monitor': 'Delay Risk Monitor',
  '/employee-productivity': 'Employee Productivity',
  '/team-intelligence': 'Team Intelligence',
};

const roleBadgeColor = {
  admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  manager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  employee: 'bg-green-500/20 text-green-300 border-green-500/30',
  auditor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const roleIconColor = {
  admin: 'text-purple-400',
  manager: 'text-blue-400',
  employee: 'text-green-400',
  auditor: 'text-orange-400',
};

function getPageTitle(pathname) {
  const exact = pageTitles[pathname];
  if (exact) return exact;
  if (pathname.startsWith('/tasks/')) {
    if (pathname.endsWith('/edit')) return 'Edit Task';
    return 'Task Details';
  }
  if (pathname.startsWith('/approvals/')) return 'Approvals';
  return 'Dashboard';
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const pageTitle = getPageTitle(location.pathname);
  const role = user?.role || '';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 shadow-sm">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: mobile menu + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all duration-200"
            aria-label="Open sidebar"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight truncate">
              {pageTitle}
            </h1>
            <p className="text-[11px] text-gray-500 font-medium leading-none mt-0.5 hidden sm:block">
              {location.pathname}
            </p>
          </div>
        </div>

        {/* Right: role badge, notifications, profile */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Role badge */}
          <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${roleBadgeColor[role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
            <FiShield className={`w-3 h-3 ${roleIconColor[role] || 'text-gray-400'}`} />
            {roleLabel}
          </span>

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all duration-200"
              aria-label="Notifications"
            >
              <FiBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-gray-900 shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationDropdown
              open={notifOpen}
              onClose={() => {
                setNotifOpen(false);
                refreshNotifications();
              }}
            />
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 pl-2 pr-2 py-1.5 rounded-xl hover:bg-gray-800 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-indigo-500/20">
                {userInitial}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-200 leading-tight truncate max-w-[120px]">
                  {user?.name || user?.email || 'User'}
                </p>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">{roleLabel}</p>
              </div>
              <FiChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 hidden md:block ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800/95 backdrop-blur-xl rounded-2xl border border-gray-700/80 shadow-xl shadow-black/30 overflow-hidden">
                <div className="p-5 border-b border-gray-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-base font-semibold shadow-lg shadow-indigo-500/20">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-200 truncate">{user?.name || user?.email || 'User'}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${roleBadgeColor[role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                        <FiShield className={`w-3 h-3 ${roleIconColor[role] || 'text-gray-400'}`} />
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {user?.email && (
                  <div className="px-5 py-3 border-b border-gray-700/60">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm text-gray-200 truncate">{user.email}</p>
                  </div>
                )}

                <div className="p-2">
                  <button
                    onClick={() => { navigate('/organization'); setProfileOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-700/60 transition-all duration-200"
                  >
                    <FiUser className="w-4 h-4 text-gray-500" />
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
