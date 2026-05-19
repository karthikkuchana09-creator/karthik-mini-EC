import { useState, useEffect } from 'react';
import { getPerformanceAnalytics } from '../api/ai';

function ScoreBadge({ score, label }) {
  const color = score >= 80 ? 'text-green-600' : score >= 55 ? 'text-amber-600' : 'text-red-600';
  const bg = score >= 80 ? 'bg-green-50 border-green-200' : score >= 55 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  return (
    <div className={`text-center p-2 rounded-lg border ${bg}`}>
      <p className={`text-lg font-bold ${color}`}>{score}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

function TrendSpark({ trends }) {
  if (!trends || trends.length < 2) return null;
  const vals = trends.map((t) => t.completed);
  const max = Math.max(1, ...vals);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {vals.slice(-6).map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-t bg-indigo-400 transition-all"
          style={{ height: `${(v / max) * 100}%` }}
          title={`${trends[trends.length - vals.length + i]?.month}: ${v} tasks`}
        />
      ))}
    </div>
  );
}

function PerformanceCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerformanceAnalytics()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Analyzing performance...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const users = data.users || [];
  const top = data.top_performers || [];
  const low = data.low_performers || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Performance Analytics</h3>
            <p className="text-xs text-gray-400 mt-0.5">Historical productivity & efficiency</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <ScoreBadge score={data.team_avg_performance ?? '-'} label="Avg Perf" />
          <ScoreBadge score={data.team_avg_reliability ?? '-'} label="Reliability" />
          <div className="text-center p-2 rounded-lg border bg-slate-50 border-slate-200">
            <p className="text-lg font-bold text-slate-700">
              {data.team_avg_completion_days != null ? `${data.team_avg_completion_days}d` : '-'}
            </p>
            <p className="text-[10px] text-gray-500">Avg Time</p>
          </div>
          <div className="text-center p-2 rounded-lg border bg-slate-50 border-slate-200">
            <p className="text-lg font-bold text-slate-700">{data.team_delay_pct ?? 0}%</p>
            <p className="text-[10px] text-gray-500">Delay Rate</p>
          </div>
        </div>

        {top.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Top Performers</p>
            <div className="flex flex-wrap gap-2">
              {top.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-800">{p.name}</span>
                  <span className="text-[10px] font-bold text-emerald-600">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {low.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Needs Improvement</p>
            <div className="flex flex-wrap gap-2">
              {low.slice(0, 3).map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-800">{p.name}</span>
                  <span className="text-[10px] font-bold text-red-600">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {users.filter((u) => u.total_completed > 0).slice(0, 8).map((u) => (
            <div key={u.user_id} className="p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">{u.name}</span>
                  <span className="text-[10px] text-gray-400">{u.role}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <TrendSpark trends={u.monthly_trends} />
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-1">
                <span className="text-green-600 font-medium">P:{u.performance_score}</span>
                <span className="text-blue-600 font-medium">R:{u.reliability_score}</span>
                <span>{u.total_completed} done</span>
                {u.delay_pct > 0 && <span className="text-red-500">{u.delay_pct}% delayed</span>}
                {u.avg_completion_days != null && <span>~{u.avg_completion_days}d avg</span>}
                <span>{u.total_comments} comments</span>
              </div>

              {u.suggestions && u.suggestions.length > 0 && u.performance_score < 70 && (
                <div className="flex items-start gap-1 mt-1">
                  <svg className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <p className="text-[10px] text-amber-700">{u.suggestions[0]}</p>
                </div>
              )}

              {u.monthly_trends && u.monthly_trends.length > 1 && (
                <div className="flex gap-2 mt-1 pt-1 border-t border-gray-50">
                  {u.monthly_trends.slice(-3).map((t) => (
                    <span key={t.month} className="text-[9px] text-gray-400">
                      {t.month.slice(5)}: {t.completed} tasks{t.avg_completion_days != null ? `, ${t.avg_completion_days}d` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {users.filter((u) => u.total_completed > 0).length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No performance data available yet
          </div>
        )}
      </div>
    </div>
  );
}

export default PerformanceCard;
