import { FiBarChart2, FiRefreshCw, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

export default function AnalyticsChartContainer({
  title,
  subtitle,
  icon: Icon,
  gradient = 'from-indigo-500 to-violet-500',
  children,
  loading = false,
  error = null,
  onRefresh,
  onExpand,
  expanded = false,
  className = '',
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
            {Icon ? <Icon className="w-4 h-4 text-white" /> : <FiBarChart2 className="w-4 h-4 text-white" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button onClick={onRefresh} className="btn-icon" title="Refresh chart" disabled={loading}>
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onExpand && (
            <button onClick={onExpand} className="btn-icon" title={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? <FiMinimize2 className="w-3.5 h-3.5" /> : <FiMaximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-48 bg-gray-100 rounded-xl" />
            <div className="flex gap-3">
              <div className="h-3 bg-gray-100 rounded w-16" />
              <div className="h-3 bg-gray-100 rounded w-16" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-2">
              <FiBarChart2 className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Failed to load chart</p>
            <p className="text-xs text-gray-400 text-center max-w-xs">{error}</p>
            {onRefresh && (
              <button onClick={onRefresh} className="mt-3 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                Retry
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
