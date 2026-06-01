import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import * as adminApi from '../api/adminDashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import HighPriorityTasksCard from '../components/HighPriorityTasksCard';
import DelayRiskCard from '../components/DelayRiskCard';
import AssignmentCard from '../components/AssignmentCard';
import WorkloadAnalysisCard from '../components/WorkloadAnalysisCard';
import PerformanceCard from '../components/PerformanceCard';
import RecommendationsCard from '../components/RecommendationsCard';
import { getErrorMessage } from '../utils/errorHandler';
import { timeAgo, formatDate, formatTimestamp } from '../utils/format';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

const STAT_ITEMS = [
  {
    key: 'total_users', label: 'Total Users',
    color: 'from-blue-600 to-blue-700',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    desc: 'Registered accounts',
  },
  {
    key: 'total_tasks', label: 'Total Tasks',
    color: 'from-indigo-500 to-indigo-600',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    desc: 'Across all statuses',
  },
  {
    key: 'pending_approvals', label: 'Pending Approvals',
    color: 'from-amber-500 to-amber-600',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    desc: 'Awaiting action',
  },
  {
    key: 'audit_events', label: 'Audit Events',
    color: 'from-violet-500 to-violet-600',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    desc: 'Total system events',
  },
  {
    key: 'documents', label: 'Documents',
    color: 'from-cyan-500 to-cyan-600',
    icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    desc: 'Uploaded files',
  },
  {
    key: 'active_users', label: 'Active Today',
    color: 'from-emerald-500 to-emerald-600',
    icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
    desc: 'Active in last 24h',
  },
];

function StatCard({ title, value, gradient, icon, desc }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums tracking-tight">{value}</p>
          {desc && <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shadow-current/10 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 shrink-0 ml-3`}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, accentColor = 'from-indigo-500 to-indigo-600', action, subtitle }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${accentColor}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {action && <span className="text-xs text-indigo-600 font-medium hover:text-indigo-800 cursor-pointer">{action}</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
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

function AdminDashboard() {
  const { user } = useAuth();
  const debounceRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [approvalStats, setApprovalStats] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const extractList = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  };

  const extractTotal = (data, ...keys) => {
    if (data?.total !== undefined && data?.total !== null) return data.total;
    if (typeof data === 'number') return data;
    for (const key of keys) {
      if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
    }
    return 0;
  };

  const fetchData = useCallback(async () => {
    try {
      const [
        summaryData, distData, approvalStatsData, perfData,
        aiSummaryData, usersData, auditStatsData, auditLogsData,
        documentsData, notifData,
      ] = await Promise.all([
        adminApi.getSummary().catch(() => null),
        adminApi.getTaskDistribution().catch(() => null),
        adminApi.getApprovalStats().catch(() => null),
        adminApi.getPerformance().catch(() => null),
        adminApi.getAISummary().catch(() => null),
        adminApi.getUsers().catch(() => null),
        adminApi.getAuditStats().catch(() => null),
        adminApi.getAuditLogs({ size: 8 }).catch(() => null),
        adminApi.getDocuments({ size: 1 }).catch(() => null),
        adminApi.getNotifications().catch(() => null),
      ]);

      setSummary(summaryData);
      setDistribution(Array.isArray(distData) ? distData : []);
      setApprovalStats(approvalStatsData);
      setPerformance(extractList(perfData, 'items', 'results', 'performance'));
      setAiData(aiSummaryData);
      setUsers(extractList(usersData, 'items', 'results', 'users'));
      setAuditStats(auditStatsData);
      setAuditLogs(extractList(auditLogsData, 'items', 'results', 'logs', 'audit_logs'));
      setDocuments(extractList(documentsData, 'items', 'results', 'documents'));
      setNotifications(extractList(notifData, 'items', 'results', 'notifications'));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load admin dashboard data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWsMessage = useCallback((data) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchData(); }, 500);
  }, [fetchData]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useWebSocket({ onMessage: handleWsMessage });

  const totalUsers = Array.isArray(users) ? users.length : 0;
  const activeUsers = Array.isArray(users) ? users.filter((u) => u.is_active !== false).length : 0;
  const inactiveUsers = totalUsers - activeUsers;

  const auditEventsTotal = auditStats?.total ?? 0;
  const auditUniqueUsers = auditStats?.unique_users ?? 0;
  const actionsByType = Array.isArray(auditStats?.actions_by_type) ? auditStats.actions_by_type : [];
  const entitiesByType = Array.isArray(auditStats?.entities_by_type) ? auditStats.entities_by_type : [];

  const documentTotal = documents?.total ?? (Array.isArray(documents) ? documents.length : 0);

  const approvalPieData = approvalStats
    ? Object.entries(approvalStats).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
      }))
    : [];

  const perfData = Array.isArray(performance) && performance.length > 0 ? performance : [];

  const userRoleData = [
    { name: 'Admin', value: Array.isArray(users) ? users.filter((u) => u.role === 'admin').length : 0 },
    { name: 'Manager', value: Array.isArray(users) ? users.filter((u) => u.role === 'manager').length : 0 },
    { name: 'Employee', value: Array.isArray(users) ? users.filter((u) => u.role === 'employee').length : 0 },
  ].filter((d) => d.value > 0);

  const statusData = Object.entries(summary || {})
    .filter(([key]) => key.includes('task') || key.includes('approval'))
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
    }));

  const completionRate = summary?.total_tasks
    ? Math.round(((summary.completed_tasks || 0) / summary.total_tasks) * 100)
    : 0;
  const approvalRate = approvalStats
    ? Math.round((((approvalStats.approved || 0) + (approvalStats.rejected || 0)) / Math.max(1,
        (approvalStats.pending || 0) + (approvalStats.approved || 0) + (approvalStats.rejected || 0) + (approvalStats.hold || 0))) * 100)
    : 0;
  const healthScore = Math.min(100, Math.round(
    (completionRate * 0.35) +
    (approvalRate * 0.25) +
    (activeUsers / Math.max(1, totalUsers) * 100 * 0.25) +
    (auditUniqueUsers > 0 ? 20 : 0)
  ));

  const healthData = [
    { label: 'Task Completion', value: completionRate, color: 'bg-indigo-500' },
    { label: 'Approval Rate', value: approvalRate, color: 'bg-emerald-500' },
    { label: 'Active Users', value: totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0, color: 'bg-blue-500' },
    { label: 'System Activity', value: auditUniqueUsers > 0 ? 100 : 0, color: 'bg-violet-500' },
  ];

  const aiRecommendations = aiData?.recommendations || aiData?.insights || [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-7 w-48 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-gray-200/70 rounded-lg animate-pulse mt-3" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonChart /><SkeletonChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonChart /><SkeletonChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart /><SkeletonChart />
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
              healthScore >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
              healthScore >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                healthScore >= 70 ? 'bg-green-500' : healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
              } animate-pulse`} />
              System Health {healthScore}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1.5">
            Enterprise monitoring · {totalUsers} users · {summary?.total_tasks ?? 0} tasks · {auditEventsTotal} audit events
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Users" value={totalUsers} gradient="from-blue-600 to-blue-700" icon={STAT_ITEMS[0].icon} desc={`${activeUsers} active · ${inactiveUsers} inactive`} />
        <StatCard title="Total Tasks" value={summary?.total_tasks ?? 0} gradient="from-indigo-500 to-indigo-600" icon={STAT_ITEMS[1].icon} desc={`${summary?.completed_tasks ?? 0} completed`} />
        <StatCard title="Pending Approvals" value={summary?.pending_approvals ?? 0} gradient="from-amber-500 to-amber-600" icon={STAT_ITEMS[2].icon} desc="Awaiting action" />
        <StatCard title="Audit Events" value={auditEventsTotal} gradient="from-violet-500 to-violet-600" icon={STAT_ITEMS[3].icon} desc={`${auditUniqueUsers} unique users`} />
        <StatCard title="Documents" value={documentTotal} gradient="from-cyan-500 to-cyan-600" icon={STAT_ITEMS[4].icon} desc="Uploaded files" />
        <StatCard title="Active Today" value={auditUniqueUsers} gradient="from-emerald-500 to-emerald-600" icon={STAT_ITEMS[5].icon} desc="Users with activity" />
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
                  <h3 className="text-sm font-semibold text-white">AI System Insights</h3>
                  <p className="text-xs text-indigo-200">Intelligence-driven enterprise analysis</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {aiRecommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="bg-white/10 rounded-lg backdrop-blur-sm p-3.5">
                    <div className="flex items-start gap-2.5">
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <HighPriorityTasksCard />
      </div>

      <div className="mb-8">
        <DelayRiskCard />
      </div>

      <div className="mb-8">
        <AssignmentCard />
      </div>

      <div className="mb-8">
        <WorkloadAnalysisCard />
      </div>

      <div className="mb-8">
        <PerformanceCard />
      </div>

      <div className="mb-8">
        <RecommendationsCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Task Distribution" accentColor="from-indigo-400 to-indigo-600" subtitle="Tasks grouped by status column">
          {distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No task distribution data</div>
          )}
        </ChartCard>

        <ChartCard title="Approval Analytics" accentColor="from-emerald-400 to-teal-500" subtitle="Approval requests by status">
          {approvalPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={approvalPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                  {approvalPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No approval data</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Audit Activity" accentColor="from-violet-400 to-purple-500" subtitle={`${actionsByType.length} action types tracked`}>
          {actionsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={actionsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="action" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No audit data</div>
          )}
        </ChartCard>

        <ChartCard title="Live Activity Stream" accentColor="from-rose-400 to-pink-500" subtitle="Recent system events">
          {auditLogs.length > 0 ? (
            <div className="space-y-0 -mx-5">
              <div className="absolute left-[23px] top-10 bottom-4 w-px bg-gray-200" />
              {auditLogs.slice(0, 7).map((a, i) => {
                const actionColor = a.action === 'create' ? 'bg-green-500' :
                  a.action === 'update' ? 'bg-blue-500' :
                  a.action === 'delete' ? 'bg-red-500' :
                  a.action === 'login' ? 'bg-gray-400' :
                  a.action === 'approve' ? 'bg-emerald-500' :
                  a.action === 'reject' ? 'bg-red-500' : 'bg-indigo-400';
                return (
                  <div key={a.id || i} className="relative flex items-start gap-3 px-5 py-2.5 hover:bg-gray-50/80 transition-colors">
                    <div className={`relative z-10 w-[30px] h-[30px] rounded-full ${actionColor} flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-white`}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        {a.action === 'create' && <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                        {a.action === 'update' && <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />}
                        {a.action === 'delete' && <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                        {a.action === 'login' && <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />}
                        {a.action === 'approve' && <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />}
                        {a.action === 'reject' && <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
                        {!['create', 'update', 'delete', 'login', 'approve', 'reject'].includes(a.action) && <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        <span className="font-medium text-gray-900">{a.user?.email || a.user_email || 'System'}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="capitalize">{a.action}</span>
                        {a.entity && <span className="text-gray-500"> on {a.entity}{a.entity_id ? ` #${a.entity_id}` : ''}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.created_at || a.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No recent activity</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Employee Performance" accentColor="from-cyan-400 to-blue-500" subtitle="Tasks assigned per team member">
          {perfData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perfData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="user" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} cursor={{ fill: 'rgba(6, 182, 212, 0.06)' }} />
                <Bar dataKey="tasks" fill="#06b6d4" radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No performance data</div>
          )}
        </ChartCard>

        <ChartCard title="User Role Distribution" accentColor="from-purple-400 to-pink-500" subtitle={`${totalUsers} total users by role`}>
          {userRoleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={userRoleData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={4} dataKey="value" stroke="none">
                  {userRoleData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 25px -4px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No user data</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="System Health" accentColor={`${healthScore >= 70 ? 'from-green-400 to-emerald-500' : healthScore >= 40 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500'}`} subtitle={`Overall system health score: ${healthScore}%`}>
          <div className="space-y-5">
            <div className="flex items-center justify-center">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="10" strokeDasharray={`${(healthScore / 100) * 327} 327`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className={`text-3xl font-bold tabular-nums ${healthScore >= 70 ? 'text-emerald-600' : healthScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{healthScore}%</p>
                    <p className="text-[10px] text-gray-400 font-medium">Healthy</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {healthData.map((h) => (
                <div key={h.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-600 font-medium">{h.label}</span>
                    <span className="text-gray-900 font-semibold tabular-nums">{h.value}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${h.color} rounded-full transition-all duration-700`} style={{ width: `${h.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Task Status Overview" accentColor="from-gray-400 to-gray-600" subtitle={`${summary?.total_tasks ?? 0} total tasks`}>
          {statusData.length > 0 ? (
            <div className="space-y-4">
              {statusData.map((s) => {
                const pct = summary?.total_tasks ? Math.round((s.value / summary.total_tasks) * 100) : 0;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-700 font-medium">{s.name}</span>
                      <span className="text-gray-900 font-semibold tabular-nums">{s.value} ({pct}%)</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No task data</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default AdminDashboard;
