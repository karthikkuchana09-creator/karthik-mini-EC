import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import * as managerApi from '../api/managerDashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { getErrorMessage } from '../utils/errorHandler';
import { timeAgo, formatDate } from '../utils/format';
import ActivityFeed from '../components/ActivityFeed';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

const STATUS_COLORS = { todo: 'bg-yellow-500', in_progress: 'bg-blue-500', review: 'bg-purple-500', done: 'bg-green-500' };

const STAT_ITEMS = [
  { key: 'total_tasks', label: 'Total Tasks', color: 'from-indigo-500 to-indigo-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'pending_approvals', label: 'Pending Approvals', color: 'from-amber-500 to-amber-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'team_members', label: 'Team Members', color: 'from-blue-500 to-blue-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'delayed_tasks', label: 'Delayed Tasks', color: 'from-rose-500 to-rose-600', icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z' },
  { key: 'completed_tasks', label: 'Completed', color: 'from-green-500 to-green-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

function StatCard({ title, value, gradient, icon }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shadow-current/10 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, accentColor = 'from-indigo-500 to-indigo-600', action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${accentColor}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {action && <span className="text-xs text-indigo-600 font-medium hover:text-indigo-800 cursor-pointer">{action}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cfg = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-orange-100 text-orange-800 border-orange-200',
    high: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg[priority] || cfg.low}`}>
      {priority || 'low'}
    </span>
  );
}

function StatusDot({ status }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[status] || 'bg-gray-400'} ring-2 ring-white`} />
  );
}

function ApprovalQueueCard({ approvals, loading, onAction }) {
  const [acting, setActing] = useState(null);

  const handleAction = async (id, action) => {
    setActing(`${id}-${action}`);
    try {
      await onAction(id, action);
      toast.success(action === 'approve' ? 'Approval granted' : 'Request rejected');
    } catch {
      toast.error('Failed to process approval');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <ChartCard title="Approval Queue" accentColor="from-amber-400 to-orange-500">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100/60 rounded-lg animate-pulse" />
          ))}
        </div>
      </ChartCard>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <ChartCard title="Approval Queue" accentColor="from-amber-400 to-orange-500">
        <div className="text-center py-10">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-400">No pending approvals</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={`Approval Queue (${approvals.length})`} accentColor="from-amber-400 to-orange-500" action="View all">
      <div className="space-y-2 -mx-5">
        {approvals.slice(0, 6).map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/80 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{a.title || a.description || `Approval #${a.id}`}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{a.user?.email || a.requested_by?.email || a.requested_by?.name || 'Unknown'}</span>
                {a.created_at && <span className="text-xs text-gray-400">· {timeAgo(a.created_at)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleAction(a.id, 'approve')}
                disabled={acting === `${a.id}-approve`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {acting === `${a.id}-approve` ? '...' : 'Approve'}
              </button>
              <button
                onClick={() => handleAction(a.id, 'reject')}
                disabled={acting === `${a.id}-reject`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {acting === `${a.id}-reject` ? '...' : 'Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {approvals.length > 6 && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-center">
          <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:text-indigo-800">
            +{approvals.length - 6} more pending
          </span>
        </div>
      )}
    </ChartCard>
  );
}

function DelayedTasksCard({ tasks, loading }) {
  if (loading) {
    return (
      <ChartCard title="Delayed Tasks" accentColor="from-rose-400 to-red-500">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100/60 rounded-lg animate-pulse" />
          ))}
        </div>
      </ChartCard>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <ChartCard title="Delayed Tasks" accentColor="from-rose-400 to-red-500">
        <div className="text-center py-10">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-400">No delayed tasks — great work!</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={`Delayed Tasks (${tasks.length})`} accentColor="from-rose-400 to-red-500">
      <div className="space-y-1 -mx-5">
        {tasks.slice(0, 5).map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/80 transition-colors">
            <StatusDot status={t.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {t.assignee?.email && <span>{t.assignee.email}</span>}
                {t.due_date && <span>Due: {formatDate(t.due_date)}</span>}
              </div>
            </div>
            <PriorityBadge priority={t.priority} />
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function NotificationsMiniCard({ notifications, loading }) {
  if (loading) {
    return (
      <ChartCard title="Notifications" accentColor="from-violet-400 to-purple-500">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-gray-200 mt-2" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <ChartCard title="Notifications" accentColor="from-violet-400 to-purple-500">
        <div className="text-center py-10">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm text-gray-400">No notifications yet</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Notifications" accentColor="from-violet-400 to-purple-500">
      <div className="space-y-0 -mx-5">
        {notifications.slice(0, 5).map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-5 py-3 transition-colors ${n.is_read ? '' : 'bg-indigo-50/30'}`}
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ring-2 ring-white ${n.is_read ? 'bg-gray-300' : 'bg-indigo-500 shadow-sm shadow-indigo-500/30'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                {n.message || n.title || 'Notification'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at || n.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [approvalStats, setApprovalStats] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const extractList = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  };

  const fetchData = useCallback(async () => {
    try {
      const [
        summaryData,
        distData,
        approvalStatsData,
        perfData,
        tasksData,
        approvalsData,
        usersData,
        notifData,
        aiSummaryData,
      ] = await Promise.all([
        managerApi.getSummary(),
        managerApi.getTaskDistribution(),
        managerApi.getApprovalStats(),
        managerApi.getPerformance(),
        managerApi.getTasks(),
        managerApi.getApprovals(),
        managerApi.getUsers(),
        managerApi.getNotifications(),
        managerApi.getAISummary(),
      ]);

      setSummary(summaryData);
      setDistribution(Array.isArray(distData) ? distData : []);
      setApprovalStats(approvalStatsData);
      setPerformance(extractList(perfData, 'items', 'results', 'performance'));
      setAllTasks(extractList(tasksData, 'items', 'results', 'tasks'));
      setApprovals(extractList(approvalsData, 'items', 'results', 'approvals'));
      setUsers(extractList(usersData, 'items', 'results', 'users'));
      setNotifications(extractList(notifData, 'items', 'results', 'notifications'));
      setAiData(aiSummaryData);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'kanban' || data.type === 'task' || data.type === 'approval' || data.type === 'notification') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchData();
      }, 500);
    }
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useWebSocket({ onMessage: handleWsMessage });

  const handleApprovalAction = useCallback(async (id, action) => {
    await managerApi.takeApprovalAction(id, action);
    fetchData();
  }, [fetchData]);

  const pendingApprovals = Array.isArray(approvals)
    ? approvals.filter((a) => a.status === 'pending' || a.status === 'pending_approval')
    : [];

  const delayedTasks = Array.isArray(allTasks)
    ? allTasks.filter((t) => {
        if (t.status === 'done') return false;
        if (t.due_date && new Date(t.due_date) < new Date()) return true;
        return t.status === 'todo' && t.priority === 'high';
      }).slice(0, 10)
    : [];

  const teamMembersCount = Array.isArray(users) ? users.length : 0;

  const statusData = Object.entries(summary || {})
    .filter(([key]) => key.includes('task') || key.includes('approval'))
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
    }));

  const approvalPieData = approvalStats
    ? Object.entries(approvalStats).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
      }))
    : [];

  const perfData = Array.isArray(performance) && performance.length > 0
    ? performance
    : [];

  const aiRecommendations = aiData?.recommendations || aiData?.insights || [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-7 w-52 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-gray-200/70 rounded-lg animate-pulse mt-3" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonChart />
          <SkeletonChart />
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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); fetchData(); }} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.email || 'Manager'} ·{' '}
            <span className="text-indigo-600 font-medium">
              {summary?.total_tasks ?? 0} total tasks · {summary?.pending_approvals ?? 0} pending approvals
            </span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {STAT_ITEMS.map((stat) => {
          let value = 0;
          if (stat.key === 'delayed_tasks') value = delayedTasks.length;
          else if (stat.key === 'team_members') value = teamMembersCount;
          else value = summary?.[stat.key] ?? 0;
          return (
            <StatCard
              key={stat.key}
              title={stat.label}
              value={value}
              gradient={stat.color}
              icon={stat.icon}
            />
          );
        })}
      </div>

      {aiData && aiRecommendations.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl shadow-lg shadow-indigo-900/20 overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Insights</h3>
                  <p className="text-xs text-indigo-200">Smart workspace analysis</p>
                </div>
              </div>
              <div className="space-y-2">
                {aiRecommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-white/10 rounded-lg backdrop-blur-sm p-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      rec.severity === 'high' ? 'bg-rose-400/20 text-rose-300' :
                      rec.severity === 'medium' ? 'bg-amber-400/20 text-amber-300' :
                      'bg-blue-400/20 text-blue-300'
                    }`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="text-sm text-white/90">{rec.message || rec.text || ''}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Kanban Analytics" accentColor="from-indigo-400 to-indigo-600">
          {distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
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
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No task distribution data</div>
          )}
        </ChartCard>

        <ChartCard title="Approval Analytics" accentColor="from-emerald-400 to-teal-500">
          {approvalPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={approvalPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {approvalPieData.map((_, index) => (
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
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No approval data</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ApprovalQueueCard
          approvals={pendingApprovals}
          loading={loading}
          onAction={handleApprovalAction}
        />

        <ChartCard title="Employee Performance" accentColor="from-cyan-400 to-blue-500">
          {perfData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={perfData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="user"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                  cursor={{ fill: 'rgba(6, 182, 212, 0.06)' }}
                />
                <Bar dataKey="tasks" fill="#06b6d4" radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No performance data</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DelayedTasksCard tasks={delayedTasks} loading={loading} />

        <ChartCard title="Recent Activity" accentColor="from-violet-400 to-purple-500">
          <ActivityFeed limit={8} showViewAll={false} compact realtime />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Task Status Overview" accentColor="from-gray-400 to-gray-500">
          {statusData.length > 0 ? (
            <div className="space-y-3">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 truncate">{s.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${summary?.total_tasks ? (s.value / summary.total_tasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 tabular-nums w-10 text-right">{s.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">No data</div>
          )}
        </ChartCard>

        <NotificationsMiniCard notifications={notifications} loading={loading} />
      </div>
    </div>
  );
}

export default ManagerDashboard;
