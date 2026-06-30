const STYLES = {
  LOW: { bg: 'bg-slate-100 text-slate-600' },
  MEDIUM: { bg: 'bg-blue-50 text-blue-700' },
  HIGH: { bg: 'bg-orange-50 text-orange-700' },
  CRITICAL: { bg: 'bg-red-50 text-red-700' },
};

export default function PriorityBadge({ priority, className = '' }) {
  const style = STYLES[priority] || STYLES.LOW;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${className}`}>
      {priority || 'LOW'}
    </span>
  );
}
