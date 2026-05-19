const SkeletonBase = ({ className = '', style }) => (
  <div className={`animate-pulse bg-gray-200/70 rounded-lg ${className}`} style={style} />
);

function Text({ width = '100%', height = 'h-4', className = '' }) {
  const widthStyle = typeof width === 'number' ? { width: `${width}%` } : undefined;
  return <SkeletonBase className={`${height} ${className}`} style={widthStyle} />;
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

function Page({ className = '' }) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      <div className="mb-8">
        <SkeletonBase className="h-8 w-48" />
        <SkeletonBase className="h-4 w-72 mt-3" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart />
        <Chart />
      </div>
    </div>
  );
}

function List({ rows = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200/70">
          <SkeletonBase className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-4 w-3/4" />
            <SkeletonBase className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Form({ fields = 4, className = '' }) {
  return (
    <div className={`space-y-5 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <SkeletonBase className="h-3.5 w-24 mb-2" />
          <SkeletonBase className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <SkeletonBase className="h-10 w-32 rounded-lg" />
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
  Page as SkeletonPage,
  List as SkeletonList,
  Form as SkeletonForm,
};
