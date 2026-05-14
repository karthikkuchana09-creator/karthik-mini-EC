import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { getDashboardSummary, getTaskDistribution } from '../api/dashboard';
import { getNotifications } from '../api/notifications';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import AIInsights from '../components/AIInsights';
import ActivityFeed from '../components/ActivityFeed';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

const STAT_ICONS = [
  { key: 'total_tasks', label: 'Total Tasks', color: 'from-indigo-500 to-indigo-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'pending_approvals', label: 'Pending Approvals', color: 'from-amber-500 to-amber-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'overdue_tasks', label: 'Overdue Tasks', color: 'from-rose-500 to-rose-600', icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z' },
  { key: 'completed_tasks', label: 'Completed', color: 'from-green-500 to-green-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const OVERDUE_FALLBACKS = ['overdue_tasks', 'delayed_tasks', 'overdue'];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getOverdueValue(summary) {
  if (!summary) return 0;
  for (const key of OVERDUE_FALLBACKS) {
    if (summary[key] !== undefined) return summary[key];
  }
  return 0;
}

function StatCard({ title, value, gradient }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1.5 tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shadow-current/10 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            {title === 'Total Tasks' && <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />}
            {title === 'Completed' && <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {title === 'Pending Approvals' && <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {title === 'Overdue Tasks' && <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />}
          </svg>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, accentColor = 'from-indigo-500 to-indigo-600' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${accentColor}`} />
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.notifications || data.results || [];
        setNotifications(list.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ChartCard title="Recent Notifications" accentColor="from-amber-400 to-orange-500">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-0 -mx-6">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-6 py-3 transition-all duration-200 hover:bg-gray-50/80 ${n.is_read ? '' : 'bg-indigo-50/30'}`}>
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ring-2 ring-white ${n.is_read ? 'bg-gray-300' : 'bg-indigo-500 shadow-sm shadow-indigo-500/30'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                  {n.message || n.title || 'Notification'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at || n.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}

function PersonalInsights({ summary }) {
  const myTasks = summary?.my_tasks ?? summary?.assigned_to_me ?? 0;
  const myCompleted = summary?.my_completed ?? 0;
  const myPending = summary?.my_pending ?? 0;

  return (
    <div className="group bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg shadow-emerald-900/20 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">My Insights</h3>
            <p className="text-xs text-emerald-200">Your personal workspace summary</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl backdrop-blur-sm p-3.5 text-center hover:bg-white/15 transition-colors">
            <p className="text-xl font-bold text-white tabular-nums">{myTasks}</p>
            <p className="text-[10px] text-emerald-200 mt-1">Assigned</p>
          </div>
          <div className="bg-white/10 rounded-xl backdrop-blur-sm p-3.5 text-center hover:bg-white/15 transition-colors">
            <p className="text-xl font-bold text-white tabular-nums">{myCompleted}</p>
            <p className="text-[10px] text-emerald-200 mt-1">Done</p>
          </div>
          <div className="bg-white/10 rounded-xl backdrop-blur-sm p-3.5 text-center hover:bg-white/15 transition-colors">
            <p className="text-xl font-bold text-white tabular-nums">{myPending}</p>
            <p className="text-[10px] text-emerald-200 mt-1">Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { isAdminOrManager } = useRolePermissions();
  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, distData] = await Promise.all([
          getDashboardSummary(),
          getTaskDistribution(),
        ]);
        setSummary(summaryData);
        setDistribution(Array.isArray(distData) ? distData : []);
      } catch (err) {
        setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to load dashboard data');
        setDistribution([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-7 w-40 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-200/70 rounded-lg animate-pulse mt-3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="mb-8">
          <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl h-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const statusData = Object.entries(summary || {})
    .filter(([key]) => key.includes('task') || key.includes('approval'))
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1.5">Welcome back, {user?.email || 'User'}</p>
      </div>

      {error && (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {STAT_ICONS.map((stat) => (
          <StatCard
            key={stat.key}
            title={stat.label}
            value={stat.key === 'overdue_tasks' ? getOverdueValue(summary) : (summary?.[stat.key] ?? 0)}
            gradient={stat.color}
          />
        ))}
      </div>

      <div className="mb-8">
        {isAdminOrManager ? <AIInsights /> : <PersonalInsights summary={summary} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Activity Feed" accentColor="from-violet-400 to-purple-500">
          <ActivityFeed limit={6} showViewAll={false} compact />
        </ChartCard>
        <NotificationsPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Task Distribution">
          {Array.isArray(distribution) && distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No data available</div>
          )}
        </ChartCard>

        <ChartCard title="Status Analytics" accentColor="from-emerald-400 to-teal-500">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No data available</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default Dashboard;
