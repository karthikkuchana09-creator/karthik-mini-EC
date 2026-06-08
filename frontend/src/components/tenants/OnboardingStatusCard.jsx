import { formatTimestamp } from '../../utils/format';

const STATUS_STYLES = {
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: 'check' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', icon: 'clock' },
  PENDING: { label: 'Pending', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', icon: 'pending' },
  FAILED: { label: 'Failed', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', icon: 'x' },
};

const STEPS = [
  { key: 'admin_created', label: 'Admin Created', description: 'First admin user account' },
  { key: 'default_workspace_created', label: 'Workspace Created', description: 'Default workspace provisioned' },
  { key: 'settings_created', label: 'Settings Configured', description: 'Organization settings applied' },
];

export default function OnboardingStatusCard({ status, tenant, onRefresh }) {
  const s = STATUS_STYLES[status?.onboarding_status] || STATUS_STYLES.PENDING;

  const completedCount = STEPS.filter((step) => status?.[step.key]).length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Onboarding Progress</h3>
            {tenant && (
              <p className="text-xs text-gray-400 mt-0.5">
                {tenant.name} &middot; {tenant.slug}
              </p>
            )}
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${s.bg} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">{completedCount} of {STEPS.length} steps complete</span>
            <span className="text-xs font-semibold text-gray-700">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status?.onboarding_status === 'FAILED'
                  ? 'bg-red-500'
                  : progressPct === 100
                  ? 'bg-emerald-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-0">
          {STEPS.map((step, idx) => {
            const done = status?.[step.key];
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={step.key} className="relative flex gap-4">
                {!isLast && (
                  <div className={`absolute left-[15px] top-10 w-0.5 h-full -translate-x-1/2 ${
                    done ? 'bg-emerald-200' : 'bg-gray-200'
                  }`} />
                )}
                <div className="relative flex flex-col items-center shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? 'bg-emerald-500 border-emerald-500'
                      : step.key === 'admin_created'
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    {done ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className={`text-xs font-bold ${step.key === 'admin_created' ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`pb-8 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                  <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {status && (
        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {status.completed_at ? (
              <span className="text-xs text-gray-400">
                Completed {formatTimestamp(status.completed_at)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">
                Created {formatTimestamp(status.created_at)}
              </span>
            )}
            {onRefresh && (
              <button onClick={onRefresh} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                Refresh
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
