const STYLES = {
  scheduled: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

export default function MeetingStatusBadge({ status, className = '' }) {
  const style = STYLES[status] || STYLES.scheduled;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status || 'scheduled'}
    </span>
  );
}
