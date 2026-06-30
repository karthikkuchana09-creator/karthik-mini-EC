const STYLES = {
  PLANNED: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  ACTIVE: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  ON_HOLD: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  CANCELLED: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

export default function ProjectStatusBadge({ status, className = '' }) {
  const style = STYLES[status] || STYLES.PLANNED;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status || 'PLANNED'}
    </span>
  );
}
