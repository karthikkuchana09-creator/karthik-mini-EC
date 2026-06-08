export default function SettingsCard({
  icon,
  title,
  description,
  limit,
  usage,
  usageLabel,
  usageColor,
  children,
}) {
  const pct = limit > 0 ? Math.min(100, Math.round(((usage || 0) / limit) * 100)) : 0;

  const barColor = usageColor || (
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">{usageLabel || 'Usage'}</span>
            <span className="text-xs font-semibold text-gray-700">
              {usage !== undefined && limit !== undefined
                ? `${usage} / ${limit}`
                : limit !== undefined
                ? `${limit}`
                : '-'}
            </span>
          </div>
          {limit > 0 && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {limit > 0 && (
            <p className="text-[10px] text-gray-400 mt-1">{pct}% utilized</p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
