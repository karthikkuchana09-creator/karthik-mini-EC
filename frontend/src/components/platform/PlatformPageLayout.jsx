import { FiLayers } from 'react-icons/fi';

function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
        <Icon className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 text-center max-w-md mb-6">{description}</p>}
      {action}
    </div>
  );
}

export default function PlatformPageLayout({
  title,
  subtitle,
  icon: Icon = FiLayers,
  badge = 'Enterprise',
  loading = false,
  empty = false,
  error = null,
  emptyTitle = 'No data found',
  emptyDescription = 'Nothing to display yet.',
  emptyAction = null,
  loadingCount = 6,
  children,
  action,
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                {badge}
              </span>
            </div>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-6">
          <p className="text-red-600 font-medium">Failed to load data</p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      )}

      {loading && !error && <LoadingSkeleton count={loadingCount} />}

      {!loading && !error && empty && (
        <EmptyState
          icon={Icon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}

      {!loading && !error && !empty && children}
    </div>
  );
}

export { LoadingSkeleton, EmptyState };
