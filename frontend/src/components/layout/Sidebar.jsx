import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiActivity,
  FiTarget,
  FiCheckSquare,
  FiCheckCircle,
  FiArrowUpCircle,
  FiUsers,
  FiShield,
  FiChevronLeft,
  FiLogOut,
  FiLayout,
  FiFile,
  FiGrid,
  FiSettings,
  FiDollarSign,
  FiCreditCard,
  FiBarChart2,
  FiTrendingUp,
  FiSliders,
  FiCalendar,
  FiCpu,
  FiUsers as FiUsersGroup,
  FiZap,
  FiStar,
  FiLayers,
  FiHash,
  FiServer,
  FiFolder,
  FiInfo,
  FiVideo,
  FiMessageSquare,
} from 'react-icons/fi';

const sections = [
  {
    label: 'MAIN',
    roles: ['admin', 'manager', 'employee', 'viewer'],
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: FiHome, roles: ['admin', 'manager', 'employee', 'viewer'] },
      { to: '/delay-risk-monitor', label: 'Analytics', icon: FiBarChart2, roles: ['admin', 'manager'] },
      { to: '/ai-analytics', label: 'AI Insights', icon: FiCpu, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'WORK MANAGEMENT',
    roles: ['admin', 'manager', 'employee'],
    items: [
      { to: '/tasks', label: 'Tasks', icon: FiCheckSquare, roles: ['admin', 'manager', 'employee'] },
      { to: '/kanban', label: 'Kanban Board', icon: FiLayout, roles: ['admin', 'manager', 'employee'] },
      { to: '/my-approvals', label: 'My Approvals', icon: FiCheckCircle, roles: ['employee'] },
      { to: '/leaves/apply', label: 'Leave Requests', icon: FiCalendar, roles: ['admin', 'manager', 'employee'] },
    ],
  },
  {
    label: 'WORKFLOW & SLA',
    roles: ['admin', 'manager', 'auditor'],
    items: [
      { to: '/sla-dashboard', label: 'SLA Dashboard', icon: FiActivity, roles: ['admin', 'manager', 'auditor'] },
      { to: '/sla-rules', label: 'SLA Rules', icon: FiTarget, roles: ['admin'] },
      { to: '/approvals/escalations', label: 'Approval Escalations', icon: FiArrowUpCircle, roles: ['admin', 'manager', 'auditor'] },
      { to: '/approvals/delegations', label: 'Approval Delegations', icon: FiUsers, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'WORKSPACE COLLABORATION',
    roles: ['admin', 'manager', 'employee', 'viewer'],
    items: [
      { to: '/workspace-list', label: 'Workspaces', icon: FiLayers, roles: ['admin', 'manager', 'employee'] },
      { to: '/tasks', label: 'My Workspace Tasks', icon: FiCheckSquare, roles: ['admin', 'manager', 'employee'] },
      { to: '/documents', label: 'Workspace Documents', icon: FiFile, roles: ['admin', 'manager', 'employee', 'viewer'] },
    ],
  },
  {
    label: 'CHANNEL COLLABORATION',
    roles: ['admin', 'manager', 'employee', 'viewer'],
    items: [
      { to: '/channels', label: 'Channels', icon: FiHash, roles: ['admin', 'manager', 'employee'] },
      { to: '/tasks', label: 'My Channel Tasks', icon: FiCheckSquare, roles: ['admin', 'manager', 'employee'] },
      { to: '/documents', label: 'Channel Documents', icon: FiFile, roles: ['admin', 'manager', 'employee', 'viewer'] },
    ],
  },
  {
    label: 'TEAMS & PROJECTS',
    roles: ['admin', 'manager', 'employee', 'viewer'],
    items: [
      { to: '/teams', label: 'Teams', icon: FiUsers, roles: ['admin', 'manager', 'employee'] },
      {
        to: '/projects', label: 'Projects', icon: FiFolder, roles: ['admin', 'manager', 'employee', 'viewer'],
        children: [
          { label: 'Project Details', icon: FiInfo },
          { label: 'Teams', icon: FiUsers },
          { label: 'Channels', icon: FiMessageSquare },
          { label: 'Tasks', icon: FiCheckSquare },
          { label: 'Documents', icon: FiFile },
          { label: 'Meetings', icon: FiVideo },
          { label: 'Calendar', icon: FiCalendar },
        ],
      },
    ],
  },
  {
    label: 'APPROVALS',
    roles: ['admin', 'manager'],
    items: [
      { to: '/approvals', label: 'Approvals', icon: FiCheckCircle, roles: ['admin', 'manager'] },
      { to: '/approvals', label: 'Approval Documents', icon: FiFile, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'ORGANIZATION',
    roles: ['admin', 'manager'],
    items: [
      { to: '/organization', label: 'Organization', icon: FiGrid, roles: ['admin', 'manager'] },
      { to: '/team-intelligence', label: 'Team Intelligence', icon: FiUsersGroup, roles: ['admin', 'manager'] },
      { to: '/manager-dashboard', label: 'Manager Dashboard', icon: FiTrendingUp, roles: ['manager'] },
      { to: '/employee-productivity', label: 'Employee Productivity', icon: FiZap, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'ADMINISTRATION',
    roles: ['admin', 'auditor'],
    items: [
      { to: '/audit-logs', label: 'Audit Logs', icon: FiShield, roles: ['admin', 'auditor'] },
      { to: '/notifications/preferences', label: 'Notification Preferences', icon: FiSliders, roles: ['admin', 'manager', 'employee', 'auditor'] },
    ],
  },
  {
    label: 'SUPER ADMIN',
    roles: ['admin'],
    items: [
      { to: '/admin/tenants', label: 'Tenants', icon: FiServer, roles: ['admin'] },
      { to: '/admin/tenants/onboarding', label: 'Tenant Onboarding', icon: FiUsers, roles: ['admin'] },
      { to: '/super-admin-dashboard', label: 'Platform Overview', icon: FiStar, roles: ['admin'] },
      { to: '/saas-dashboard', label: 'SaaS Dashboard', icon: FiGrid, roles: ['admin'] },
      { to: '/admin-dashboard', label: 'Admin Dashboard', icon: FiTrendingUp, roles: ['admin'] },
      { to: '/admin-monitoring', label: 'Monitoring', icon: FiBarChart2, roles: ['admin'] },
      { to: '/admin', label: 'Admin', icon: FiSettings, roles: ['admin'] },
    ],
  },
  {
    label: 'BILLING',
    roles: ['admin', 'manager', 'employee'],
    items: [
      { to: '/pricing', label: 'Pricing', icon: FiDollarSign, roles: ['admin', 'manager'] },
      { to: '/credits', label: 'Credits', icon: FiCreditCard, roles: ['admin', 'manager', 'employee'] },
    ],
  },
];

export default function Sidebar({ open, collapsed, onClose, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const role = user?.role || '';
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-out ${
          collapsed ? 'w-16' : 'w-64'
        } ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-gray-800 shrink-0 ${
          collapsed ? 'justify-center px-0' : 'gap-3 px-5'
        }`}>
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <span className="text-white font-bold text-sm">EC</span>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${
            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}>
            <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">Mini Enterprise</span>
            <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">Enterprise Workspace</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-2 space-y-4 scrollbar-hide">
          {sections.map((section) => {
            const visible = section.items.filter((item) => item.roles.includes(role));
            if (visible.length === 0) return null;
            return (
              <div key={section.label}>
                {!collapsed && (
                  <div className="px-3 mb-1.5">
                    <span className="text-[10px] font-semibold text-gray-500 tracking-[0.12em] uppercase">
                      {section.label}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {visible.map((item) => {
                    const Icon = item.icon;
                    if (item.children) {
                      return (
                        <div key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.to === '/dashboard'}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                                collapsed ? 'justify-center w-full h-10' : 'gap-3 px-3 py-2.5'
                              } ${
                                isActive
                                  ? 'bg-indigo-600/20 text-indigo-300 shadow-sm shadow-indigo-500/10'
                                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                {isActive && !collapsed && (
                                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full shadow-sm shadow-indigo-400/40" />
                                )}
                                {isActive && collapsed && (
                                  <span className="absolute inset-0 rounded-xl ring-1 ring-indigo-500/40" />
                                )}
                                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                                <span className={`truncate transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                                  {item.label}
                                </span>
                                {isActive && !collapsed && (
                                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse opacity-60" />
                                )}
                                {collapsed && (
                                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 text-gray-200 text-xs font-medium rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                                    {item.label}
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                                  </div>
                                )}
                              </>
                            )}
                          </NavLink>
                          {!collapsed && (
                            <div className="ml-5 mt-0.5 space-y-0.5 pl-3 border-l border-gray-800/60">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                return (
                                  <div key={child.label}
                                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-500 cursor-default">
                                    <ChildIcon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                                    <span className="truncate">{child.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/dashboard'}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                            collapsed ? 'justify-center w-full h-10' : 'gap-3 px-3 py-2.5'
                          } ${
                            isActive
                              ? 'bg-indigo-600/20 text-indigo-300 shadow-sm shadow-indigo-500/10'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !collapsed && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full shadow-sm shadow-indigo-400/40" />
                            )}
                            {isActive && collapsed && (
                              <span className="absolute inset-0 rounded-xl ring-1 ring-indigo-500/40" />
                            )}
                            <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                            <span className={`truncate transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                              {item.label}
                            </span>
                            {isActive && !collapsed && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse opacity-60" />
                            )}
                            {collapsed && (
                              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 text-gray-200 text-xs font-medium rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                                {item.label}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                              </div>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-gray-800 p-3 space-y-2">
          {/* Status indicator */}
          <div className={`rounded-xl bg-gray-800/50 border border-gray-700/50 ${
            collapsed ? 'p-2' : 'p-3'
          }`}>
            <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
              <span className="relative flex w-2 h-2 shrink-0">
                <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
              </span>
              <div className={`overflow-hidden transition-all duration-300 ${
                collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              }`}>
                <p className="text-xs font-semibold text-gray-300 whitespace-nowrap">System Online</p>
                <p className="text-[10px] text-gray-500 whitespace-nowrap">All systems operational</p>
              </div>
            </div>
          </div>

          {/* Logout */}
          {!collapsed && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <FiLogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          )}

          {/* Collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 transition-all duration-200 ${
              collapsed ? 'h-9' : 'h-9 gap-2'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiChevronLeft className={`w-4 h-4 transition-transform duration-300 ${
              collapsed ? 'rotate-180' : ''
            }`} />
            <span className={`text-xs font-medium transition-all duration-300 ${
              collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
            }`}>
              Collapse
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}
    </>
  );
}
