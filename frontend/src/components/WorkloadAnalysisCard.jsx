import { useState, useEffect } from 'react';
import { getWorkloadAnalysis } from '../api/ai';

const statusColors = {
  overloaded: 'bg-red-500',
  balanced: 'bg-green-500',
  underutilized: 'bg-amber-400',
};

const statusBg = {
  overloaded: 'bg-red-50 border-red-200',
  balanced: 'bg-green-50 border-green-200',
  underutilized: 'bg-amber-50 border-amber-200',
};

const statusText = {
  overloaded: 'text-red-700',
  balanced: 'text-green-700',
  underutilized: 'text-amber-700',
};

function HealthGauge({ score }) {
  const color = score >= 70 ? 'stroke-green-500' : score >= 45 ? 'stroke-amber-400' : 'stroke-red-500';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex items-center gap-2">
      <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" className={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 32 32)" />
        <text x="32" y="32" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold fill-gray-700">{score}</text>
      </svg>
      <div>
        <p className="text-xs font-semibold text-gray-900">Team Health</p>
        <p className="text-[10px] text-gray-400">{score >= 70 ? 'Good' : score >= 45 ? 'Fair' : 'Needs attention'}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = statusColors[status] || statusColors.balanced;
  const bg = statusBg[status] || statusBg.balanced;
  const text = statusText[status] || statusText.balanced;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {status}
    </span>
  );
}

function HeatmapBar({ label, value, maxVal, color }) {
  const pct = maxVal > 0 ? Math.min(100, (value / maxVal) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-20 truncate shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded bg-slate-100 overflow-hidden">
        <div className={`h-full rounded transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-5 text-right">{value}</span>
    </div>
  );
}

function WorkloadAnalysisCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkloadAnalysis()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Analyzing workload...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tb = data.team_balance || {};
  const employees = data.employees || [];
  const maxActive = Math.max(1, ...employees.map((e) => e.active_tasks));

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${
        tb.overloaded_count > 0 ? 'from-red-500 via-amber-400 to-green-500' : 'from-green-400 to-emerald-500'
      }`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Workload Analysis</h3>
            <p className="text-xs text-gray-400 mt-0.5">Team distribution & balance</p>
          </div>
          <HealthGauge score={tb.health_score || 0} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
            <p className="text-lg font-bold text-red-700">{tb.overloaded_count || 0}</p>
            <p className="text-[10px] text-red-500">Overloaded</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
            <p className="text-lg font-bold text-green-700">{tb.balanced_count || 0}</p>
            <p className="text-[10px] text-green-500">Balanced</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="text-lg font-bold text-amber-700">{tb.underutilized_count || 0}</p>
            <p className="text-[10px] text-amber-500">Underutilized</p>
          </div>
        </div>

        {tb.recommendations && tb.recommendations.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
            <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">Recommendations</p>
            {tb.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-indigo-700">
                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {r}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {employees.map((e) => (
            <div key={e.user_id} className="p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusBadge status={e.status} />
                  <span className="text-sm font-medium text-gray-900 truncate">{e.name}</span>
                  <span className="text-[10px] text-gray-400">{e.role}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium shrink-0 ml-2">
                  <span className={e.workload_score >= 6 ? 'text-red-600' : 'text-gray-500'}>
                    W:{e.workload_score.toFixed(1)}
                  </span>
                  <span className={e.efficiency_score >= 6 ? 'text-green-600' : 'text-gray-500'}>
                    E:{e.efficiency_score.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-[10px] text-gray-400">{e.active_tasks} active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-gray-400">{e.overdue_tasks} overdue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-[10px] text-gray-400">{e.pending_approvals} approvals</span>
                </div>
              </div>
              <div className="mt-1.5">
                <HeatmapBar label={e.name} value={e.active_tasks} maxVal={maxActive} color={
                  e.status === 'overloaded' ? 'bg-red-400' : e.status === 'underutilized' ? 'bg-amber-400' : 'bg-green-400'
                } />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkloadAnalysisCard;
