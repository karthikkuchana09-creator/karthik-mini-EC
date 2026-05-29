import { FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';

export default function SLABadge({ deadline, completedAt, status, className = '' }) {
  if (status === 'done' || completedAt) {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 ${className}`} role="status" aria-label="SLA met">
        <FiCheckCircle className="w-3 h-3" />
        Met SLA
      </span>
    );
  }

  if (!deadline) return null;

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const hoursLeft = (deadlineDate - now) / (1000 * 60 * 60);
  const isOverdue = hoursLeft < 0;
  const isAtRisk = hoursLeft >= 0 && hoursLeft < 4;

  if (isOverdue) {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 ${className}`} role="status" aria-label="SLA breached">
        <FiAlertCircle className="w-3 h-3" />
        Breached
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isAtRisk ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-blue-100 text-blue-800 border-blue-200'} ${className}`}
      role="status"
      aria-label={`SLA: ${Math.round(hoursLeft)} hours remaining`}
    >
      <FiClock className="w-3 h-3" />
      {Math.round(hoursLeft)}h left
    </span>
  );
}
