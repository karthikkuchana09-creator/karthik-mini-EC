import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDelayRisks, getWorkloadAnalysis } from '../api/ai';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const RISK_STYLES = {
  high: { badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', bar: '#ef4444', bg: 'bg-red-50' },
  medium: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400', bar: '#f59e0b', bg: 'bg-amber-50' },
  low: { badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', bar: '#10b981', bg: 'bg-green-50' },
};

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

function useAutoRefresh(fetch, interval = 45) {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setStale(true), (interval - 10) * 1000);
    return () => clearInterval(t);
  }, [interval]);
  useEffect(() => { if (stale) { fetch(); setStale(false); } }, [stale, fetch]);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value?.toFixed?.(1) ?? p.value}</p>
      ))}
    </div>
  );
}

function StatBox({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 transition-all duration-300 hover:shadow-md">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${accent || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function FactorRadar({ factors }) {
  if (!factors) return null;
  const data = Object.entries(factors).map(([k, v]) => ({
    factor: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    score: v.score || 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9, fill: '#6b7280' }} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 8, fill: '#9ca3af' }} />
        <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={1.5} />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function FactorHeatmap({ items }) {
  if (!items?.length) return null;
  const factors = ['due_date', 'workload', 'stagnation', 'history', 'approval'];
  const labels = ['Due Date', 'Workload', 'Stagnation', 'History', 'Approval'];

  const getColor = (score) => {
    if (score >= 7) return 'bg-red-400';
    if (score >= 4) return 'bg-amber-400';
    if (score >= 1) return 'bg-green-300';
    return 'bg-gray-100';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-gray-400 font-medium pb-2 pr-3">Task</th>
            {labels.map((l) => <th key={l} className="text-center text-gray-400 font-medium pb-2 px-1">{l}</th>)}
            <th className="text-center text-gray-400 font-medium pb-2 pl-2">Risk</th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 10).map((item) => (
            <tr key={item.task_id} className="border-t border-gray-50">
              <td className="py-2 pr-3 text-gray-700 max-w-[140px] truncate">{item.title}</td>
              {factors.map((f) => {
                const s = item.factors?.[f]?.score || 0;
                return <td key={f} className="py-1 px-1"><div className={`w-6 h-6 rounded mx-auto ${getColor(s)}`} title={`${f}: ${s}`} /></td>;
              })}
              <td className="py-2 pl-2 text-center">
                <span className={`inline-block w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white ${
                  item.risk_level === 'high' ? 'bg-red-500' : item.risk_level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                }`}>{item.risk_score?.toFixed?.(0) || '?'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FactorContribChart({ items }) {
  if (!items?.length) return null;
  const factors = ['due_date', 'workload', 'stagnation', 'history', 'approval'];
  const labels = ['Due Date', 'Workload', 'Stagnation', 'History', 'Approval'];

  const avgScores = factors.map((f, i) => ({
    name: labels[i],
    score: +(items.reduce((s, it) => s + (it.factors?.[f]?.score || 0), 0) / items.length).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={avgScores}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RiskCard({ item, expanded, onToggle }) {
  const rs = RISK_STYLES[item.risk_level] || RISK_STYLES.low;
  const statusLabel = STATUS_LABELS[item.status] || item.status;

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 ${
      expanded ? 'border-indigo-200 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
    }`}>
      <div className="p-4 cursor-pointer" onClick={() => onToggle(item.task_id)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${rs.badge}`}>
                {item.risk_level}
              </span>
              <span className="text-[10px] text-gray-400">{statusLabel}</span>
              {item.priority === 'high' && (
                <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-600">HIGH</span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
              {item.assignee_name && <span>{item.assignee_name}</span>}
              {item.days_remaining != null && (
                <span className={item.days_remaining < 0 ? 'text-red-500 font-medium' : ''}>
                  {item.days_remaining < 0 ? `${Math.abs(item.days_remaining)}d overdue` : `${item.days_remaining}d left`}
                </span>
              )}
              {item.predicted_delay_days != null && (
                <span className="text-orange-600 font-medium">~{item.predicted_delay_days}d delay</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
              item.risk_level === 'high' ? 'bg-red-500' : item.risk_level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
            }`}>
              {item.risk_score?.toFixed?.(0) || '?'}
            </div>
            <span className="text-[8px] text-gray-400">score</span>
          </div>
        </div>

        {item.warnings?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.warnings.map((w, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-red-50 text-red-600 border border-red-200">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {w}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>Confidence:</span>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${item.confidence_score >= 0.8 ? 'bg-green-500' : item.confidence_score >= 0.6 ? 'bg-amber-400' : 'bg-slate-400'}`}
                style={{ width: `${Math.round(item.confidence_score * 100)}%` }} />
            </div>
            <span className="font-medium">{Math.round(item.confidence_score * 100)}%</span>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && item.factors && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50 rounded-b-xl">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Factor Breakdown</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FactorRadar factors={item.factors} />
            <div className="space-y-2">
              {Object.entries(item.factors).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-20 shrink-0 capitalize">{k.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      v.score >= 7 ? 'bg-red-400' : v.score >= 4 ? 'bg-amber-400' : 'bg-green-400'
                    }`} style={{ width: `${(v.score / 10) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 w-6 text-right">{v.score.toFixed(1)}</span>
                  <span className="text-[8px] text-gray-400 w-8 text-right">×{v.weight.toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-600 w-20">Composite</span>
                <div className={`w-16 h-2 rounded-full ${
                  item.risk_level === 'high' ? 'bg-red-500' : item.risk_level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                }`} />
                <span className="text-[11px] font-bold text-gray-700">{item.risk_score.toFixed(2)}</span>
                <span className="text-[9px] text-gray-400">{item.risk_level}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DelayRiskMonitor() {
  const [rawItems, setRawItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, high_risk: 0, medium_risk: 0, low_risk: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('risk');

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const d = await getDelayRisks();
      setRawItems(d?.items || []);
      setStats({ total: d?.total || 0, high_risk: d?.high_risk || 0, medium_risk: d?.medium_risk || 0, low_risk: d?.low_risk || 0 });
      setLastUpdated(new Date());
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAutoRefresh(fetchData, 45);

  const handleWsMessage = useCallback((msg) => {
    if (['task', 'system'].includes(msg.type)) fetchData();
  }, [fetchData]);
  useWebSocket({ onMessage: handleWsMessage });

  const items = useMemo(() => {
    let filtered = [...rawItems];
    if (filterLevel !== 'all') filtered = filtered.filter((i) => i.risk_level === filterLevel);
    if (filterStatus !== 'all') filtered = filtered.filter((i) => i.status === filterStatus);
    if (sortBy === 'risk') filtered.sort((a, b) => b.risk_score - a.risk_score);
    else if (sortBy === 'days') filtered.sort((a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999));
    else if (sortBy === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title));
    return filtered;
  }, [rawItems, filterLevel, filterStatus, sortBy]);

  const highItems = rawItems.filter((i) => i.risk_level === 'high');

  const statuses = useMemo(() => {
    const s = new Set(rawItems.map((i) => i.status));
    return ['all', ...Array.from(s)];
  }, [rawItems]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">Unable to load delay risk data. Please check your connection.</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 animate-pulse" />
          <div><div className="h-5 w-48 bg-gray-200 rounded animate-pulse" /><div className="h-3 w-32 bg-gray-100 rounded mt-1.5 animate-pulse" /></div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-2xl border p-5"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" /><div className="h-7 w-12 bg-gray-100 rounded animate-pulse" /></div>)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delay Risk Monitor</h1>
            <p className="text-xs text-gray-400">AI-predicted task risk analysis & alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className={`w-1.5 h-1.5 rounded-full ${lastUpdated ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
            {lastUpdated ? `Updated ${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago` : 'Loading...'}
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all" title="Refresh">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {highItems.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800">{highItems.length} task{highItems.length > 1 ? 's' : ''} at high risk of delay</p>
            <p className="text-xs text-red-600 mt-0.5">Immediate attention required — {highItems.slice(0, 3).map((i) => i.title).join(', ')}{highItems.length > 3 ? ` and ${highItems.length - 3} more` : ''}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBox label="Total Tasks" value={stats.total} sub="Monitored" />
        <StatBox label="High Risk" value={stats.high_risk} sub={`${stats.total ? ((stats.high_risk / stats.total) * 100).toFixed(0) : 0}% of total`} accent="text-red-600" />
        <StatBox label="Medium Risk" value={stats.medium_risk} sub={`${stats.total ? ((stats.medium_risk / stats.total) * 100).toFixed(0) : 0}% of total`} accent="text-amber-600" />
        <StatBox label="Low Risk" value={stats.low_risk} sub={`${stats.total ? ((stats.low_risk / stats.total) * 100).toFixed(0) : 0}% of total`} accent="text-green-600" />
      </div>

      {rawItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Avg Factor Contribution</p>
            <FactorContribChart items={rawItems} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Risk Factor Heatmap</p>
            <div className="text-[10px] text-gray-400 mb-2 flex items-center gap-3">
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-red-400 mr-1" /> High</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-amber-400 mr-1" /> Med</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-green-300 mr-1" /> Low</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-gray-100 mr-1" /> None</span>
            </div>
            <FactorHeatmap items={rawItems} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Risk Details</h3>
            <div className="flex items-center gap-2 ml-auto">
              <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                <option value="all">All Levels</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                <option value="all">All Statuses</option>
                {statuses.filter((s) => s !== 'all').map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                <option value="risk">Risk Score</option>
                <option value="days">Days Left</option>
                <option value="title">Title</option>
              </select>
              <span className="text-[10px] text-gray-400">{items.length} of {rawItems.length}</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {items.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">No tasks match the current filters</div>
          )}
          {items.map((item) => (
            <RiskCard key={item.task_id} item={item} expanded={expandedId === item.task_id} onToggle={setExpandedId} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default DelayRiskMonitor;
