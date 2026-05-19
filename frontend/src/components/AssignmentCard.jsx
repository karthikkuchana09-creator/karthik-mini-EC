import { useState } from 'react';
import { recommendAssignment } from '../api/ai';

function FactorBar({ label, score, maxScore = 100 }) {
  const pct = Math.min(100, (score / maxScore) * 100);
  const color = score >= 80 ? 'bg-green-400' : score >= 55 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-7 text-right">{score.toFixed(0)}</span>
    </div>
  );
}

function AssignmentCard() {
  const [priority, setPriority] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommendAssignment({ priority: priority || undefined });
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to get recommendation');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Task Assignment AI</h3>
            <p className="text-xs text-gray-400 mt-0.5">Smart employee recommendation engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Task Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            >
              <option value="">Any priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button
            onClick={handleRecommend}
            disabled={loading}
            className="self-end px-4 py-1.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing
              </span>
            ) : (
              'Recommend'
            )}
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {data && data.recommended_user && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-violet-500 uppercase tracking-wider">Best Match</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{data.recommended_user.name}</p>
                <p className="text-xs text-gray-400">{data.recommended_user.email} · {data.recommended_user.role}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">{data.score}<span className="text-sm font-normal text-violet-400">/100</span></div>
                <p className="text-[10px] text-violet-400">score</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-violet-200">
              <svg className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-xs text-violet-700">{data.reason}</p>
            </div>
          </div>
        )}

        {data && data.candidates && data.candidates.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              All Candidates ({data.total_candidates})
            </p>
            <div className="space-y-1.5">
              {data.candidates.map((c, i) => (
                <div
                  key={c.user_id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                    i === 0
                      ? 'bg-violet-50 border-violet-200'
                      : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      i === 0 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${i === 0 ? 'text-violet-900' : 'text-gray-700'}`}>
                        {c.name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{c.role} · {c.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="hidden sm:flex items-center gap-2">
                      <FactorBar label="Work" score={c.factors.workload?.score ?? 0} />
                      <FactorBar label="Speed" score={c.factors.speed?.score ?? 0} />
                      <FactorBar label="Reliability" score={c.factors.reliability?.score ?? 0} />
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${
                      i === 0 ? 'text-violet-600' : 'text-gray-500'
                    }`}>
                      {c.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && !data.recommended_user && (
          <div className="py-8 text-center text-sm text-gray-400">
            No suitable candidates found
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignmentCard;
