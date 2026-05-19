import { useState, useEffect } from 'react';
import { getDelayRisks } from '../api/ai';

const riskColors = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-green-500',
};

const riskBg = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low: 'bg-green-50 border-green-200',
};

const riskText = {
  high: 'text-red-700',
  medium: 'text-amber-700',
  low: 'text-green-700',
};

function RiskBadge({ level }) {
  const color = riskColors[level] || riskColors.low;
  const bg = riskBg[level] || riskBg.low;
  const text = riskText[level] || riskText.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {level} risk
    </span>
  );
}

function ConfidenceMeter({ score }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'bg-green-500' : score >= 0.6 ? 'bg-amber-400' : 'bg-slate-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function FactorBar({ label, score, weight }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 7 ? 'bg-red-400' : score >= 4 ? 'bg-amber-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-6 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

function DelayRiskCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDelayRisks()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Analyzing delay risks...</span>
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) return null;

  const hasRisks = data.high_risk > 0 || data.medium_risk > 0;
  const highItems = data.items.filter((i) => i.risk_level === 'high');
  const mediumItems = data.items.filter((i) => i.risk_level === 'medium');

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${
        data.high_risk > 0 ? 'from-red-500 via-amber-400 to-green-400' : 'from-amber-400 to-green-400'
      }`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Delay Risk Detection</h3>
            <p className="text-xs text-gray-400 mt-0.5">AI-predicted task delays</p>
          </div>
          <div className="flex items-center gap-2">
            {data.high_risk > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-700">{data.high_risk}</span>
                <span className="text-[10px] text-red-500">high</span>
              </div>
            )}
            {data.medium_risk > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-amber-700">{data.medium_risk}</span>
                <span className="text-[10px] text-amber-500">medium</span>
              </div>
            )}
          </div>
        </div>

        {hasRisks && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
            <WarningIcon />
            <span className="text-xs font-medium text-red-700">
              {data.high_risk > 0
                ? `${data.high_risk} task${data.high_risk > 1 ? 's' : ''} at high risk of delay`
                : `${data.medium_risk} task${data.medium_risk > 1 ? 's' : ''} at medium risk of delay`
              }
            </span>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {[...highItems, ...mediumItems].slice(0, 6).map((item) => (
            <div key={item.task_id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={item.risk_level} />
                    <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {item.assignee_name && (
                      <span className="flex items-center gap-1">{item.assignee_name}</span>
                    )}
                    {item.days_remaining !== null && (
                      <span className={item.days_remaining < 0 ? 'text-red-500 font-medium' : ''}>
                        {item.days_remaining < 0
                          ? `${Math.abs(item.days_remaining)}d overdue`
                          : `${item.days_remaining}d left`
                        }
                      </span>
                    )}
                    {item.predicted_delay_days !== null && item.predicted_delay_days !== undefined && (
                      <span className="text-orange-600 font-medium">
                        ~{item.predicted_delay_days}d delay predicted
                      </span>
                    )}
                    <ConfidenceMeter score={item.confidence_score} />
                  </div>
                </div>
              </div>

              {item.warnings.length > 0 && (
                <div className="mb-2 space-y-0.5">
                  {item.warnings.map((w, wi) => (
                    <div key={wi} className="flex items-center gap-1 text-[10px] text-red-600">
                      <WarningIcon />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-5 gap-1 pt-2 border-t border-gray-50">
                <FactorBar label="Due date" score={item.factors.due_date?.score ?? 0} weight={item.factors.due_date?.weight} />
                <FactorBar label="Workload" score={item.factors.workload?.score ?? 0} weight={item.factors.workload?.weight} />
                <FactorBar label="Stagnation" score={item.factors.stagnation?.score ?? 0} weight={item.factors.stagnation?.weight} />
                <FactorBar label="History" score={item.factors.history?.score ?? 0} weight={item.factors.history?.weight} />
                <FactorBar label="Approval" score={item.factors.approval?.score ?? 0} weight={item.factors.approval?.weight} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DelayRiskCard;
