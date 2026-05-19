import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsDashboard } from '../api/ai';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { jwtDecode } from 'jwt-decode';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

function useAutoRefresh(fetch, interval = 60) {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setStale(true), (interval - 10) * 1000);
    return () => clearInterval(timer);
  }, [interval]);
  useEffect(() => {
    if (stale) { fetch(); setStale(false); }
  }, [stale, fetch]);
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:border-gray-300/80 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1.5 tabular-nums group-hover:scale-105 transition-transform origin-left">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

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

function RiskBar({ label, score, max = 10 }) {
  const pct = Math.min(100, (score / max) * 100);
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium text-gray-500 w-6 text-right tabular-nums">{score}</span>
    </div>
  );
}

function RiskAnalysisSection({ delayRisks }) {
  const items = delayRisks?.items || [];
  const highCount = delayRisks?.high_risk || 0;
  const medCount = delayRisks?.medium_risk || 0;
  const total = delayRisks?.total || 0;

  return (
    <Section title="Risk Analysis" subtitle={`${highCount} high, ${medCount} medium of ${total} tasks`}>
      <div className="space-y-2.5">
        {items.slice(0, 5).map((r) => (
          <div key={r.task_id} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-900 truncate">{r.title}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                r.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                r.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>{r.risk_level}</span>
            </div>
            <RiskBar label={`${r.days_remaining != null ? r.days_remaining + 'd left' : 'No due date'}`} score={r.risk_score} />
            {r.warnings?.length > 0 && (
              <p className="text-[10px] text-red-500 mt-1">{r.warnings[0]}</p>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function WorkloadSection({ workload }) {
  const dist = workload?.distribution || {};
  const balance = workload?.team_balance || {};
  const employees = workload?.employees || [];

  const pieData = [
    { name: 'Overloaded', value: dist.overloaded || 0 },
    { name: 'Balanced', value: dist.balanced || 0 },
    { name: 'Underutilized', value: dist.underutilized || 0 },
  ].filter((d) => d.value > 0);

  const barData = employees.slice(0, 8).map((e) => ({
    name: e.name?.split(' ')[0] || e.email?.split('@')[0] || `U${e.user_id}`,
    Active: e.active_tasks,
    Overdue: e.overdue_tasks,
  }));

  const healthColor = (balance.health_score || 0) >= 70 ? 'text-green-600' : (balance.health_score || 0) >= 40 ? 'text-amber-600' : 'text-red-600';
  const healthBg = (balance.health_score || 0) >= 70 ? 'bg-green-50 border-green-200' : (balance.health_score || 0) >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <Section title="Workload Distribution" subtitle="Team balance and individual load">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className={`px-3 py-2 rounded-lg border ${healthBg}`}>
              <p className={`text-2xl font-bold ${healthColor} tabular-nums`}>{balance.health_score ?? '-'}</p>
              <p className="text-[10px] text-gray-500">Health Score</p>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>{balance.overloaded_count || 0} overloaded · {balance.underutilized_count || 0} available</p>
              <p>Mean: {balance.mean_workload ?? '-'} · StdDev: {balance.std_dev_workload ?? '-'}</p>
            </div>
          </div>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] text-gray-500">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 mb-3">Active vs Overdue by Employee</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barGap={2} barCategoryGap={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Active" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {balance.recommendations?.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Suggestions</p>
          {balance.recommendations.map((r, i) => (
            <p key={i} className="text-xs text-amber-800">{r}</p>
          ))}
        </div>
      )}
    </Section>
  );
}

function PerformanceCharts({ performance }) {
  const trends = performance?.monthly_trends || [];
  const perf = performance?.team_avg_performance ?? '-';
  const rel = performance?.team_avg_reliability ?? '-';
  const avgDays = performance?.team_avg_completion_days;
  const delayPct = performance?.team_delay_pct ?? 0;
  const top = performance?.top_performers || [];

  return (
    <Section title="Performance Analytics" subtitle="Team productivity and trends">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200">
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">{perf}</p>
              <p className="text-[10px] text-emerald-700">Avg Performance</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <p className="text-2xl font-bold text-blue-600 tabular-nums">{rel}</p>
              <p className="text-[10px] text-blue-700">Reliability</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-2xl font-bold text-slate-600 tabular-nums">{avgDays != null ? `${avgDays}d` : '-'}</p>
              <p className="text-[10px] text-slate-600">Avg Time</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-2xl font-bold text-rose-600 tabular-nums">{delayPct}%</p>
              <p className="text-[10px] text-rose-700">Delay Rate</p>
            </div>
          </div>
          {top.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {top.map((p) => (
                <div key={p.user_id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-800">{p.name}</span>
                  <span className="text-[10px] font-bold text-emerald-600">{p.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          {trends.length > 0 ? (
            <>
              <p className="text-xs font-medium text-gray-400 mb-3">Monthly Completion Trends</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="completed" stroke="#6366f1" fill="url(#compGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              {trends.length > 1 && (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avg_completion_days" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Avg Days" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No trend data available</div>
          )}
        </div>
      </div>
    </Section>
  );
}

function ProductivityTrends({ highPriority, delayRisks }) {
  const hp = highPriority?.tasks || [];
  const dr = delayRisks?.items || [];

  const hpByUrgency = { critical: 0, high: 0, medium: 0, low: 0 };
  hp.forEach((t) => { hpByUrgency[t.urgency_level] = (hpByUrgency[t.urgency_level] || 0) + 1; });

  const urgencyData = Object.entries(hpByUrgency).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }));
  const deadlineData = dr.filter((r) => r.days_remaining != null).slice(0, 6).map((r) => ({
    name: r.title.length > 20 ? r.title.slice(0, 20) + '...' : r.title,
    days: r.days_remaining,
  }));

  return (
    <Section title="Productivity Trends" subtitle="Task urgency and deadline proximity">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-3">High-Priority Tasks by Urgency</p>
          {urgencyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={urgencyData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {urgencyData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#9ca3af'][i % 4]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-sm text-gray-400">No high-priority tasks</div>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 mb-3">Days Remaining for At-Risk Tasks</p>
          {deadlineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deadlineData} layout="vertical" barCategoryGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="days" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-sm text-gray-400">No at-risk tasks</div>
          )}
        </div>
      </div>
    </Section>
  );
}

function RecommendationsSection({ recommendations }) {
  const items = recommendations || [];
  const PRIORITY_STYLES = {
    critical: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700' },
    high: { border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700' },
    medium: { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700' },
    low: { border: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-600' },
  };

  return (
    <Section title="Smart Recommendations" subtitle={`${items.length} actionable insights`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.slice(0, 6).map((rec, i) => {
          const ps = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.low;
          return (
            <div key={i} className={`border-l-4 ${ps.border} bg-gray-50/50 rounded-r-xl p-4 hover:bg-gray-50 transition-all`}>
              <div className="flex items-start gap-2 mb-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${ps.badge}`}>{rec.priority}</span>
                <span className="text-[10px] text-gray-400">{rec.type}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-0.5">{rec.title}</p>
              <p className="text-xs text-gray-500">{rec.description}</p>
              {rec.impact && <p className="text-[10px] text-green-600 font-medium mt-1">{rec.impact}</p>}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Confidence:</span>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[80px]">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.round(rec.confidence * 100)}%` }} />
                </div>
                <span className="text-[10px] font-medium text-gray-500">{Math.round(rec.confidence * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function AIAnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const d = await getAnalyticsDashboard();
      setData(d);
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAutoRefresh(fetchData, 60);

  const handleWsMessage = useCallback((msg) => {
    if (['task', 'approval', 'system'].includes(msg.type)) fetchData();
  }, [fetchData]);
  useWebSocket({ onMessage: handleWsMessage });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 animate-pulse" />
          <div>
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 rounded mt-1.5 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">Unable to load analytics data</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  const summary = data.summary || [];
  const hp = data.high_priority_tasks || {};
  const dr = data.delay_risks || {};
  const wl = data.workload || {};
  const perf = data.performance || {};
  const recs = data.recommendations || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Analytics Dashboard</h1>
            <p className="text-xs text-gray-400">Enterprise intelligence overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className={`w-1.5 h-1.5 rounded-full ${lastUpdated ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
            {lastUpdated ? `Updated ${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago` : 'Loading...'}
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" label="Total Tasks" value={hp.total || 0} sub={`${hp.critical || 0} critical`} />
        <StatCard icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" label="High Risk" value={dr.high_risk || 0} sub={`${dr.medium_risk || 0} medium risk`} />
        <StatCard icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" label="Overloaded" value={wl?.team_balance?.overloaded_count ?? 0} sub={`${wl?.team_balance?.underutilized_count ?? 0} available`} />
        <StatCard icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" label="Recommendations" value={recs.length} sub="Actionable insights" />
      </div>

      {summary.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {summary.slice(0, 6).map((text, i) => {
            const isCritical = /overdue|delayed|blocked|critical|ignored/i.test(text);
            const isPositive = /completed|strong|on track|healthy|available/i.test(text);
            return (
              <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border animate-in fade-in slide-in-from-top-1 duration-300 ${
                isCritical ? 'bg-red-50 text-red-700 border-red-200' :
                isPositive ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`} style={{ animationDelay: `${i * 100}ms` }}>
                {isCritical ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                ) : isPositive ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                )}
                {text}
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-6">
        <RiskAnalysisSection delayRisks={dr} />
        <WorkloadSection workload={wl} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceCharts performance={perf} />
          <ProductivityTrends highPriority={hp} delayRisks={dr} />
        </div>
        <RecommendationsSection recommendations={recs} />
      </div>
    </div>
  );
}

export default AIAnalyticsDashboard;
