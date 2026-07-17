import { useState, useEffect, useCallback } from 'react';
import { FiBarChart2, FiTrendingUp, FiUsers, FiCheckCircle, FiFile, FiCalendar, FiRefreshCw, FiFilter } from 'react-icons/fi';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import platformApi from '../../services/platform/platformService';
import { getWorkspaces } from '../../api/workspaces';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-16 animate-pulse" />
          <div className="h-7 bg-gray-100 rounded w-24 animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value ?? '-'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children, loading, height = 300 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">
        {loading ? (
          <div className="space-y-3" style={{ height }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
                <div className="h-3 w-8 bg-gray-100 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </div>
    </div>
  );
}

function PieChartContent({ data, dataKey = 'count', nameKey = 'status' }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-xs text-gray-400">No data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BarChartContent({ data, bars, xKey = 'name' }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-xs text-gray-400">No data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {bars.map((b, i) => (
          <Bar key={b.dataKey} dataKey={b.dataKey} name={b.name} fill={BAR_COLORS[i % BAR_COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function FilterBar({ workspaces, filters, onChange, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Filters</span>
        </div>

        <select
          value={filters.workspace_id || ''}
          onChange={(e) => onChange('workspace_id', e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          disabled={loading}
        >
          <option value="">All Workspaces</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => onChange('start_date', e.target.value || undefined)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            disabled={loading}
          />
          <span className="text-xs text-gray-300">-</span>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => onChange('end_date', e.target.value || undefined)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            disabled={loading}
          />
        </div>

        <button
          onClick={() => onChange('reset')}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={loading}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toFixed(1);
  }
  return val;
}

export default function PlatformAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(Array.isArray(res) ? res : res?.items || res?.data || []);
    } catch { /* workspace list is optional */ }
  }, []);

  const fetchAll = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (f.workspace_id) params.workspace_id = f.workspace_id;
      if (f.start_date) params.start_date = f.start_date;
      if (f.end_date) params.end_date = f.end_date;

      const [projects, teams, tasks, approvals, documents] = await Promise.all([
        platformApi.analytics.projects(params).then((r) => r.data),
        platformApi.analytics.teams(params).then((r) => r.data),
        platformApi.analytics.tasks(params).then((r) => r.data),
        platformApi.analytics.approvals(params).then((r) => r.data),
        platformApi.analytics.documents(params).then((r) => r.data),
      ]);
      setData({ projects, teams, tasks, approvals, documents });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  useEffect(() => {
    fetchAll(filters);
  }, [filters, fetchAll]);

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({});
      return;
    }
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => fetchAll(filters);

  const statCards = [
    { icon: FiTrendingUp, label: 'Projects', value: data?.projects?.total, color: 'from-indigo-500 to-blue-500', sub: `${data?.projects?.overdue ?? 0} overdue, ${data?.projects?.near_deadline ?? 0} near deadline` },
    { icon: FiUsers, label: 'Teams', value: data?.teams?.total, color: 'from-emerald-500 to-teal-500', sub: `${data?.teams?.total_members ?? 0} members, avg ${data?.teams?.avg_team_size ?? '-'}` },
    { icon: FiCheckCircle, label: 'Tasks', value: data?.tasks?.total, color: 'from-amber-500 to-orange-500', sub: `${data?.tasks?.completed ?? 0} done, ${data?.tasks?.overdue ?? 0} overdue` },
    { icon: FiCheckCircle, label: 'Approvals', value: data?.approvals?.total, color: 'from-rose-500 to-red-500', sub: `${data?.approvals?.pending ?? 0} pending, ${data?.approvals?.delayed ?? 0} delayed` },
    { icon: FiFile, label: 'Documents', value: data?.documents?.total, color: 'from-purple-500 to-pink-500', sub: `${data?.documents?.recent_uploads ?? 0} recent, ${data?.documents?.total_versions ?? 0} versions` },
  ];

  const projectProgressData = data?.projects?.by_status;
  const taskStatusData = data?.tasks?.by_status;
  const taskPriorityData = data?.tasks?.by_priority;
  const approvalStatusData = data?.approvals?.by_status;
  const approvalLevelData = data?.approvals?.pending_by_level?.map((l) => ({ name: l.status, count: l.count }));
  const docUploaderData = data?.documents?.by_uploader?.map((u) => ({ name: u.user_name, count: u.count }));
  const teamWorkloadData = data?.teams?.teams?.map((t) => ({ name: t.name, members: t.member_count }));

  return (
    <PlatformPageLayout
      title="Analytics"
      subtitle="Real-time insights and metrics across your enterprise"
      icon={FiBarChart2}
      loading={false}
      error={error}
      action={
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        <FilterBar
          workspaces={workspaces}
          filters={filters}
          onChange={handleFilterChange}
          loading={loading}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} loading={loading} />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ChartCard title="Project Progress" subtitle="Projects by status" loading={loading}>
            <PieChartContent data={projectProgressData} />
          </ChartCard>

          <ChartCard title="Task Status" subtitle="Tasks by completion status" loading={loading}>
            <PieChartContent data={taskStatusData} />
          </ChartCard>

          <ChartCard title="Task Priority" subtitle="Tasks by priority level" loading={loading}>
            <PieChartContent data={taskPriorityData} dataKey="count" nameKey="priority" />
          </ChartCard>

          <ChartCard title="Approval Status" subtitle="Approvals by current status" loading={loading}>
            <PieChartContent data={approvalStatusData} />
          </ChartCard>

          <ChartCard title="Approvals by Level" subtitle="Pending approvals by level" loading={loading}>
            <BarChartContent data={approvalLevelData} bars={[{ dataKey: 'count', name: 'Pending' }]} xKey="name" />
          </ChartCard>

          <ChartCard title="Top Uploaders" subtitle="Documents by uploader" loading={loading}>
            <BarChartContent data={docUploaderData} bars={[{ dataKey: 'count', name: 'Documents' }]} xKey="name" />
          </ChartCard>

          <ChartCard title="Team Workload" subtitle="Team members distribution" loading={loading}>
            <BarChartContent data={teamWorkloadData} bars={[{ dataKey: 'members', name: 'Members' }]} xKey="name" />
          </ChartCard>

          <ChartCard title="Task Completion" subtitle="Completed vs pending overview" loading={loading}>
            <BarChartContent
              data={data?.tasks ? [{ name: 'Completed', count: data.tasks.completed }, { name: 'Pending', count: data.tasks.pending }] : []}
              bars={[{ dataKey: 'count', name: 'Tasks' }]}
              xKey="name"
            />
          </ChartCard>

          <ChartCard title="Project Health" subtitle="Overdue and near-deadline projects" loading={loading}>
            <BarChartContent
              data={data?.projects ? [{ name: 'Overdue', count: data.projects.overdue }, { name: 'Near Deadline', count: data.projects.near_deadline }] : []}
              bars={[{ dataKey: 'count', name: 'Projects' }]}
              xKey="name"
            />
          </ChartCard>
        </div>
      </div>
    </PlatformPageLayout>
  );
}
