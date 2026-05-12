function SkeletonBase({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200/70 rounded-lg ${className}`} />
  );
}

function Text({ width = '100%', height = 'h-4', className = '' }) {
  return <SkeletonBase className={`${height} ${typeof width === 'string' ? `w-${width}` : ''} ${className}`} style={typeof width === 'number' ? { width: `${width}%` } : undefined} />;
}

function Card({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/70 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <SkeletonBase className="h-4 w-24" />
          <SkeletonBase className="h-8 w-16" />
        </div>
        <SkeletonBase className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  );
}

function Chart({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm ${className}`}>
      <div className="h-1 bg-gradient-to-r from-gray-200 to-gray-300" />
      <div className="p-6 space-y-4">
        <SkeletonBase className="h-4 w-32" />
        <SkeletonBase className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  );
}

function TableRows({ rows = 5, cols = 5, className = '' }) {
  return (
    <div className={className}>
      <div className="bg-gray-50/80 border-b border-gray-200/60 px-6 py-3.5">
        <div className="flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonBase key={i} className="h-3.5 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-8 px-6 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBase key={c} className={`h-4 ${c === 0 ? 'w-48' : c === cols - 1 ? 'w-24' : 'w-16'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ className = '' }) {
  return <SkeletonBase className={`w-8 h-8 rounded-full shrink-0 ${className}`} />;
}

function Badge({ className = '' }) {
  return <SkeletonBase className={`h-5 w-14 rounded-full ${className}`} />;
}

function NotificationCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <SkeletonBase className="w-3 h-3 rounded-full mt-1.5 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-3/4" />
          <SkeletonBase className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

function StatRow({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-6 py-3 ${className}`}>
      <SkeletonBase className="w-8 h-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBase className="h-3.5 w-40" />
        <SkeletonBase className="h-3 w-24" />
      </div>
    </div>
  );
}

export default SkeletonBase;
export {
  SkeletonBase,
  Text as SkeletonText,
  Card as SkeletonCard,
  Chart as SkeletonChart,
  TableRows as SkeletonTableRows,
  Avatar as SkeletonAvatar,
  Badge as SkeletonBadge,
  NotificationCard as SkeletonNotificationCard,
  StatRow as SkeletonStatRow,
};
