import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTeamIntelligence } from '../api/ai';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
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

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#7c3aed', '#6d28d9', '#5b21b6'];
const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#6b7280'];

function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <span className="text-lg shrink-0">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function TeamIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recFilter, setRecFilter] = useState('all');

  const fetchData = useCallback(() => {
    setError(false);
    setLoading(true);
    getTeamIntelligence()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const workloadData = useMemo(() => {
    if (!data?.team_workload?.employees) return [];
    return data.team_workload.employees
      .slice()
      .sort((a, b) => b.workload_score - a.workload_score)
      .map((e) => ({ name: e.name, workload: e.workload_score, efficiency: e.efficiency_score, active: e.active_tasks, overdue: e.overdue_tasks }));
  }, [data]);

  const rankingsData = useMemo(() => {
    if (!data?.productivity_rankings?.rankings) return [];
    return data.productivity_rankings.rankings
      .slice()
      .sort((a, b) => b.performance_score - a.performance_score)
      .slice(0, 10)
      .map((r) => ({ name: r.name, score: r.performance_score, completed: r.completed_tasks, delayed: r.delayed_tasks }));
  }, [data]);

  const delayData = useMemo(() => {
    if (!data?.delayed_task_analysis?.by_user) return [];
    return data.delayed_task_analysis.by_user
      .slice()
      .sort((a, b) => b.total_delayed - a.total_delayed)
      .slice(0, 10)
      .map((d) => ({ name: d.name, overdue: d.overdue_count, completedLate: d.completed_late_count }));
  }, [data]);

  const approvalData = useMemo(() => {
    if (!data?.approval_efficiency?.by_user) return [];
    return data.approval_efficiency.by_user
      .slice()
      .sort((a, b) => b.approval_rate - a.approval_rate)
      .map((a) => ({ name: a.name, rate: a.approval_rate, pending: a.pending, avgWait: a.avg_wait_hours || 0 }));
  }, [data]);

  const filteredRecs = useMemo(() => {
    if (!data?.recommendations) return [];
    if (recFilter === 'all') return data.recommendations;
    return data.recommendations.filter((r) => r.priority === recFilter);
  }, [data, recFilter]);

  const teamPie = useMemo(() => {
    if (!data?.team_workload?.employees) return [];
    const e = data.team_workload.employees;
    const overloaded = e.filter((x) => x.workload_score > 7).length;
    const balanced = e.filter((x) => x.workload_score >= 4 && x.workload_score <= 7).length;
    const underutilized = e.filter((x) => x.workload_score < 4).length;
    return [
      { name: 'Overloaded (>7)', value: overloaded, color: '#ef4444' },
      { name: 'Balanced (4-7)', value: balanced, color: '#f59e0b' },
      { name: 'Underutilized (<4)', value: underutilized, color: '#10b981' },
    ].filter((x) => x.value > 0);
  }, [data]);

  const delayPie = useMemo(() => {
    if (!data?.delayed_task_analysis) return [];
    const d = data.delayed_task_analysis;
    return [
      { name: 'Overdue Active', value: d.overdue_active || 0, color: '#ef4444' },
      { name: 'Completed Late', value: d.completed_late || 0, color: '#f59e0b' },
    ].filter((x) => x.value > 0);
  }, [data]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">Unable to load team intelligence data. Please check your connection.</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
          <div><div className="h-5 w-52 bg-gray-200 rounded animate-pulse" /><div className="h-3 w-40 bg-gray-100 rounded mt-1.5 animate-pulse" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">{[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl border p-5"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-3" /><div className="h-7 w-14 bg-gray-100 rounded animate-pulse" /></div>)}</div>
        <div className="grid grid-cols-2 gap-6 mb-6">{[1, 2].map((i) => <div key={i} className="h-64 bg-white rounded-2xl border animate-pulse" />)}</div>
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
      </div>
    );
  }

  const tw = data?.team_workload || {};
  const pr = data?.productivity_rankings || {};
  const dt = data?.delayed_task_analysis || {};
  const ae = data?.approval_efficiency || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Intelligence</h1>
            <p className="text-xs text-gray-400">Manager-level insights — workloads, productivity, delays, approvals</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Employees" value={tw.total_employees || 0} icon="👥" />
        <KpiCard label="Avg Workload" value={(tw.avg_workload || 0).toFixed(2)} sub="Out of 10" accent={tw.avg_workload > 7 ? 'text-red-600' : tw.avg_workload > 4 ? 'text-amber-600' : 'text-green-600'} icon="⚡" />
        <KpiCard label="Avg Efficiency" value={(tw.avg_efficiency || 0).toFixed(2)} sub="Score" accent={tw.avg_efficiency > 7 ? 'text-green-600' : 'text-amber-600'} icon="📈" />
        <KpiCard label="Total Delayed" value={dt.total_delayed || 0} sub={`${dt.overdue_active || 0} overdue active`} accent={dt.total_delayed > 10 ? 'text-red-600' : 'text-amber-600'} icon="⏰" />
        <KpiCard label="Approval Rate" value={`${(ae.avg_approval_rate || 0).toFixed(0)}%`} sub={`${ae.delayed_approvals || 0} delayed`} accent={ae.avg_approval_rate > 80 ? 'text-green-600' : 'text-red-600'} icon="✅" />
        <KpiCard label="Performance" value={(pr.avg_performance || 0).toFixed(2)} sub="Team avg" accent={pr.avg_performance > 7 ? 'text-green-600' : 'text-amber-600'} icon="🏆" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <SectionHeader title="Workload Comparison" subtitle="Workload score per employee (0-10)" />
          <ResponsiveContainer width="100%" height={Math.max(200, workloadData.length * 36)}>
            <BarChart data={workloadData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="workload" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                {workloadData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <SectionHeader title="Productivity Rankings" subtitle="Top employees by performance score" />
          <ResponsiveContainer width="100%" height={Math.max(200, rankingsData.length * 36)}>
            <BarChart data={rankingsData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16}>
                {rankingsData.map((_, i) => <Cell key={i} fill={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#10b981', '#34d399'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <SectionHeader title="Workload Distribution" subtitle="Team balance breakdown" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={teamPie} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={3}>
                {teamPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#6b7280' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <SectionHeader title="Delayed Task Analysis" subtitle="Overdue vs completed late" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={delayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="overdue" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} name="Overdue Active" />
              <Bar dataKey="completedLate" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Completed Late" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <SectionHeader title="Delay Breakdown" subtitle="Active vs completed" />
          {delayPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={delayPie} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {delayPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', color: '#6b7280' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">No delayed tasks</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <SectionHeader title="Approval Efficiency" subtitle="Approval rate per employee" />
          <ResponsiveContainer width="100%" height={Math.max(200, (approvalData.length || 1) * 36)}>
            <BarChart data={approvalData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} formatter={(v) => `${v}%`} />
              <Bar dataKey="rate" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <SectionHeader title="Workload Heatmap" subtitle="Employee × metric matrix" />
          {workloadData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-gray-400 font-medium pb-2 pr-3">Employee</th>
                    <th className="text-center text-gray-400 font-medium pb-2 px-2">Workload</th>
                    <th className="text-center text-gray-400 font-medium pb-2 px-2">Efficiency</th>
                    <th className="text-center text-gray-400 font-medium pb-2 px-2">Active</th>
                    <th className="text-center text-gray-400 font-medium pb-2 pl-2">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadData.map((emp) => {
                    const wlColor = emp.workload > 7 ? 'bg-red-500' : emp.workload > 4 ? 'bg-amber-500' : 'bg-green-500';
                    const efColor = emp.efficiency > 7 ? 'bg-green-500' : emp.efficiency > 4 ? 'bg-amber-500' : 'bg-red-500';
                    const acColor = emp.active > 8 ? 'bg-red-500' : emp.active > 4 ? 'bg-amber-500' : 'bg-green-500';
                    const odColor = emp.overdue > 3 ? 'bg-red-500' : emp.overdue > 0 ? 'bg-amber-500' : 'bg-green-400';
                    return (
                      <tr key={emp.name} className="border-t border-gray-50">
                        <td className="py-2 pr-3 text-gray-700 font-medium truncate max-w-[100px]">{emp.name}</td>
                        <td className="py-1 px-2 text-center"><div className={`w-7 h-7 rounded mx-auto flex items-center justify-center text-white text-[9px] font-bold ${wlColor}`}>{emp.workload.toFixed(1)}</div></td>
                        <td className="py-1 px-2 text-center"><div className={`w-7 h-7 rounded mx-auto flex items-center justify-center text-white text-[9px] font-bold ${efColor}`}>{emp.efficiency.toFixed(1)}</div></td>
                        <td className="py-1 px-2 text-center"><div className={`w-7 h-7 rounded mx-auto flex items-center justify-center text-white text-[9px] font-bold ${acColor}`}>{emp.active}</div></td>
                        <td className="py-1 pl-2 text-center"><div className={`w-7 h-7 rounded mx-auto flex items-center justify-center text-white text-[9px] font-bold ${odColor}`}>{emp.overdue}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No workload data</div>
          )}
        </div>
      </div>

      {data?.recommendations?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Recommendations</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Actionable suggestions for team improvement</p>
              </div>
              <div className="flex gap-1.5">
                {['all', 'high', 'medium', 'low'].map((l) => (
                  <button key={l} onClick={() => setRecFilter(l)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      recFilter === l ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>{l === 'all' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecs.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-gray-400">No recommendations match filter</div>
            )}
            {filteredRecs.map((rec, i) => (
              <div key={i} className={`p-3 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                rec.priority === 'high' || rec.priority === 'critical' ? 'bg-red-50 border-red-200' :
                rec.priority === 'medium' ? 'bg-amber-50 border-amber-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                    rec.priority === 'high' || rec.priority === 'critical' ? 'bg-red-200 text-red-800' :
                    rec.priority === 'medium' ? 'bg-amber-200 text-amber-800' :
                    'bg-green-200 text-green-800'
                  }`}>{rec.priority}</span>
                  {rec.type && <span className="text-[9px] text-gray-400 uppercase">{rec.type}</span>}
                </div>
                <p className="text-xs font-medium text-gray-900 mb-0.5">{rec.title}</p>
                <p className="text-[10px] text-gray-500 leading-relaxed">{rec.description}</p>
                {rec.impact && (
                  <div className="mt-1.5 flex items-center gap-1 text-[9px] text-indigo-600">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {rec.impact}
                  </div>
                )}
                {rec.confidence && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${
                        rec.confidence >= 0.8 ? 'bg-green-500' : rec.confidence >= 0.6 ? 'bg-amber-400' : 'bg-slate-400'
                      }`} style={{ width: `${Math.round(rec.confidence * 100)}%` }} />
                    </div>
                    <span className="text-[8px] text-gray-400">{Math.round(rec.confidence * 100)}% confidence</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamIntelligence;
