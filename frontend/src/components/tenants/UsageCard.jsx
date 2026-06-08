const GRADIENTS = {
  workspaces: { from: 'from-indigo-500', to: 'to-indigo-600' },
  channels: { from: 'from-blue-500', to: 'to-blue-600' },
  members: { from: 'from-emerald-500', to: 'to-emerald-600' },
  storage: { from: 'from-amber-500', to: 'to-amber-600' },
};

const ICONS = {
  workspaces: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  channels: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75',
  members: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  storage: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
};

export default function UsageCard({ type, label, used, limit, suffix, format }) {
  const gradient = GRADIENTS[type] || GRADIENTS.workspaces;
  const icon = ICONS[type] || ICONS.workspaces;

  const displayUsed = format ? format(used) : used;
  const displayLimit = limit !== undefined ? (format ? format(limit) : limit) : null;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient.from} ${gradient.to} flex items-center justify-center shadow-md`}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
          {displayLimit !== null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              pct >= 90 ? 'bg-red-50 text-red-700' : pct >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
            }`}>
              {pct}%
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
          {displayUsed}
          {suffix && <span className="text-sm font-medium text-gray-400 ml-1">{suffix}</span>}
        </p>
        {displayLimit !== null && (
          <p className="text-xs text-gray-400 mt-0.5">
            of {displayLimit} limit
          </p>
        )}
        {limit > 0 && (
          <div className="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
