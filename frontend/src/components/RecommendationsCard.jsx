import { useState, useEffect } from 'react';
import { getRecommendations } from '../api/ai';

const PRIORITY_STYLES = {
  critical: { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-200', icon: 'text-red-500' },
  high: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'text-amber-500' },
  medium: { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'text-blue-500' },
  low: { bar: 'bg-gray-300', badge: 'bg-gray-100 text-gray-600 border-gray-200', icon: 'text-gray-400' },
};

const TYPE_ICONS = {
  prioritization: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  escalation: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  redistribution: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  assignment: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

function ConfidenceMeter({ confidence }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'bg-green-400' : pct >= 55 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
    </div>
  );
}

function RecommendationsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getRecommendations()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Analyzing recommendations...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const items = data.recommendations || [];
  const criticalCount = items.filter((r) => r.priority === 'critical').length;
  const highCount = items.filter((r) => r.priority === 'high').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">AI Recommendations</h3>
            <p className="text-xs text-gray-400 mt-0.5">Actionable insights across all analytics</p>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                {highCount} high
              </span>
            )}
          </div>
        </div>

        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No recommendations — everything looks healthy
          </div>
        )}

        <div className="space-y-2">
          {items.slice(0, 10).map((rec, i) => {
            const ps = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.low;
            const isExpanded = expanded === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : i)}
              >
                <div className={`h-0.5 ${ps.bar}`} />
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`mt-0.5 shrink-0 ${ps.icon}`}>
                        {TYPE_ICONS[rec.type] || TYPE_ICONS.prioritization}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">{rec.title}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${ps.badge}`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rec.description}</p>
                      </div>
                    </div>
                    <ConfidenceMeter confidence={rec.confidence} />
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <span className="ml-1 text-gray-700 capitalize font-medium">{rec.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Source:</span>
                          <span className="ml-1 text-gray-700">{rec.source}</span>
                        </div>
                        {rec.entity_name && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Entity:</span>
                            <span className="ml-1 text-gray-700">{rec.entity_name}</span>
                          </div>
                        )}
                        {rec.impact && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Impact:</span>
                            <span className="ml-1 text-green-600 font-medium">{rec.impact}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                        <svg className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[11px] text-indigo-800 font-medium">{rec.action}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 10 && (
          <p className="text-[10px] text-gray-400 text-center mt-3">
            +{items.length - 10} more recommendations in full report
          </p>
        )}
      </div>
    </div>
  );
}

export default RecommendationsCard;
