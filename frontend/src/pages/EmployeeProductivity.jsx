import { useState, useEffect, useMemo, useCallback } from 'react';
import { getEmployeeProductivity } from '../api/ai';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(1)) : p.value}</p>
      ))}
    </div>
  );
};

function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function EmployeeRow({ employee, expanded, onToggle }) {
  const perfColor = employee.performance_score >= 8 ? 'text-green-600' : employee.performance_score >= 5 ? 'text-amber-600' : 'text-red-600';
  const wlColor = employee.workload_score > 7 ? 'text-red-600' : employee.workload_score > 4 ? 'text-amber-600' : 'text-green-600';
  const statusBadge = employee.workload_status === 'overloaded' ? 'bg-red-100 text-red-700 border-red-200' :
    employee.workload_status === 'underutilized' ? 'bg-blue-100 text-blue-700 border-blue-200' :
    'bg-green-100 text-green-700 border-green-200';

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 ${
      expanded ? 'border-indigo-200 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
    }`}>
      <div className="p-4 cursor-pointer" onClick={() => onToggle(employee.user_id)}>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{employee.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{employee.email} · {employee.role}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-gray-400">Completed</p>
              <p className="text-sm font-semibold text-gray-800">{employee.completed_tasks}</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-gray-400">Delays</p>
              <p className="text-sm font-semibold text-gray-800">{employee.delayed_tasks}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Perf</p>
              <p className={`text-sm font-bold ${perfColor}`}>{employee.performance_score.toFixed(1)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Load</p>
              <p className={`text-sm font-bold ${wlColor}`}>{employee.workload_score.toFixed(1)}</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${statusBadge} hidden lg:inline`}>
              {employee.workload_status}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Metrics</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Completed Tasks', value: employee.completed_tasks },
                  { label: 'Delayed Tasks', value: employee.delayed_tasks, accent: employee.delayed_tasks > 0 ? 'text-red-600' : '' },
                  { label: 'Delay Rate', value: `${employee.delay_pct.toFixed(0)}%`, accent: employee.delay_pct > 30 ? 'text-red-600' : '' },
                  { label: 'Avg Completion', value: employee.avg_completion_days ? `${employee.avg_completion_days.toFixed(1)}d` : 'N/A' },
                  { label: 'Performance', value: employee.performance_score.toFixed(2), accent: perfColor },
                  { label: 'Workload', value: employee.workload_score.toFixed(2), accent: wlColor },
                  { label: 'Efficiency', value: employee.efficiency_score.toFixed(2) },
                  { label: 'Approval Rate', value: `${(employee.approval_rate * 100).toFixed(0)}%` },
                ].map((m) => (
                  <div key={m.label} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-[9px] text-gray-400">{m.label}</p>
                    <p className={`text-sm font-bold ${m.accent || 'text-gray-800'}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {employee.monthly_trends?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Completion Trend</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={employee.monthly_trends}>
                      <defs><linearGradient id={`grad-${employee.user_id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="1" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="completed" stroke="#6366f1" fill={`url(#grad-${employee.user_id})`} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {employee.insights?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Insights</p>
                  <div className="space-y-1.5">
                    {employee.insights.map((ins, i) => (
                      <div key={i} className={`flex items-start gap-2 text-[10px] p-2 rounded-lg ${
                        ins.type === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'
                      }`}>
                        <span className="mt-0.5">{ins.type === 'warning' ? '⚠️' : '✅'}</span>
                        <span>{ins.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {employee.suggestions?.length > 0 && employee.suggestions[0] && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Suggestions</p>
                  <ul className="space-y-1">
                    {employee.suggestions.map((s, i) => (
                      <li key={i} className="text-[10px] text-gray-600 flex items-start gap-1.5">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {employee.improvement_tips?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Improvement Tips</p>
                  <ul className="space-y-1">
                    {employee.improvement_tips.map((t, i) => (
                      <li key={i} className="text-[10px] text-gray-600 flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">✦</span>
                        <span>{t}</span>
                      </li>
                    ))}
                    {employee.improvement_tips.length === 0 && (
                      <li className="text-[10px] text-gray-400 italic">No improvement suggestions — performing well</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeProductivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState('performance');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(() => {
    setError(false);
    setLoading(true);
    getEmployeeProductivity()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const employees = useMemo(() => {
    if (!data?.employees) return [];
    let filtered = [...data.employees];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));
    }
    if (sortBy === 'performance') filtered.sort((a, b) => b.performance_score - a.performance_score);
    else if (sortBy === 'workload') filtered.sort((a, b) => b.workload_score - a.workload_score);
    else if (sortBy === 'completed') filtered.sort((a, b) => b.completed_tasks - a.completed_tasks);
    else if (sortBy === 'delays') filtered.sort((a, b) => b.delayed_tasks - a.delayed_tasks);
    else if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [data, sortBy, searchTerm]);

  const completionTrends = useMemo(() => {
    if (!data?.employees) return [];
    const agg = {};
    for (const emp of data.employees) {
      for (const t of emp.monthly_trends || []) {
        if (!agg[t.month]) agg[t.month] = { month: t.month, completed: 0, count: 0, totalDays: 0 };
        agg[t.month].completed += t.completed;
        agg[t.month].count += 1;
        if (t.avg_completion_days) agg[t.month].totalDays += t.avg_completion_days;
      }
    }
    return Object.values(agg).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
      ...m,
      avg_completion_days: m.count ? +(m.totalDays / m.count).toFixed(1) : null,
    }));
  }, [data]);

  const perfDistribution = useMemo(() => {
    if (!data?.employees) return [];
    const buckets = { '0-2': 0, '2-4': 0, '4-6': 0, '6-8': 0, '8-10': 0 };
    for (const e of data.employees) {
      const s = e.performance_score;
      if (s < 2) buckets['0-2']++;
      else if (s < 4) buckets['2-4']++;
      else if (s < 6) buckets['4-6']++;
      else if (s < 8) buckets['6-8']++;
      else buckets['8-10']++;
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [data]);

  const allInsights = useMemo(() => {
    if (!data?.employees) return [];
    const seen = new Set();
    const items = [];
    for (const emp of data.employees) {
      for (const ins of emp.insights || []) {
        const key = ins.text.slice(0, 40);
        if (!seen.has(key)) { seen.add(key); items.push({ ...ins, employee: emp.name }); }
      }
    }
    return items.slice(0, 10);
  }, [data]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">Unable to load employee productivity data. Please check your connection.</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
          <div><div className="h-5 w-52 bg-gray-200 rounded animate-pulse" /><div className="h-3 w-36 bg-gray-100 rounded mt-1.5 animate-pulse" /></div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">{[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-2xl border p-5"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" /><div className="h-7 w-12 bg-gray-100 rounded animate-pulse" /></div>)}</div>
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employee Productivity</h1>
            <p className="text-xs text-gray-400">Per-employee analytics, AI insights, and improvement recommendations</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Employees" value={data?.total_employees || 0} icon="👥" />
        <KpiCard label="Avg Performance" value={data?.team_avg_performance?.toFixed(2) || '0.00'} sub="Team-wide score" accent="text-indigo-600" icon="📊" />
        <KpiCard label="Avg Workload" value={data?.team_avg_workload?.toFixed(2) || '0.00'} sub="Out of 10" accent={data?.team_avg_workload > 6 ? 'text-red-600' : 'text-amber-600'} icon="⚡" />
        <KpiCard label="Team Delay Rate" value={`${data?.team_delay_pct?.toFixed(0) || '0'}%`} sub={data?.team_avg_completion_days ? `Avg ${data.team_avg_completion_days.toFixed(1)}d completion` : ''} accent={data?.team_delay_pct > 30 ? 'text-red-600' : 'text-green-600'} icon="⏱️" />
      </div>

      {completionTrends.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Completion Trends</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={completionTrends}>
                <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="1" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="completed" stroke="#6366f1" fill="url(#trendGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Performance Distribution</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perfDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {allInsights.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Productivity Insights</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allInsights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs p-3 rounded-xl ${
                ins.type === 'warning' ? 'bg-amber-50 text-amber-800' : ins.type === 'positive' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
              }`}>
                <span className="mt-0.5 shrink-0">{ins.type === 'warning' ? '⚠️' : ins.type === 'positive' ? '✅' : '💡'}</span>
                <div>
                  <p className="font-medium">{ins.text}</p>
                  {ins.employee && <p className="text-[10px] opacity-70 mt-0.5">— {ins.employee}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Employee Details</h3>
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search employees..." className="text-xs border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 bg-white text-gray-600 w-44 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-gray-300" />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                <option value="performance">Performance</option>
                <option value="workload">Workload</option>
                <option value="completed">Completed</option>
                <option value="delays">Delays</option>
                <option value="name">Name</option>
              </select>
              <span className="text-[10px] text-gray-400">{employees.length} employees</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {employees.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">No employees match the search</div>
          )}
          {employees.map((emp) => (
            <EmployeeRow key={emp.user_id} employee={emp} expanded={expandedId === emp.user_id} onToggle={setExpandedId} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmployeeProductivity;
