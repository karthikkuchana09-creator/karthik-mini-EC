import { FiCalendar } from 'react-icons/fi';

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  label = 'Date Range',
  startLabel = 'Start date',
  endLabel = 'End date',
  className = '',
  disabled = false,
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="group" aria-label={label}>
      <FiCalendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
      {label && <span className="text-sm font-medium text-gray-600">{label}</span>}
      <input
        type="date"
        value={startDate || ''}
        onChange={(e) => onStartChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={startLabel}
      />
      <span className="text-gray-400 text-sm" aria-hidden="true">to</span>
      <input
        type="date"
        value={endDate || ''}
        onChange={(e) => onEndChange(e.target.value)}
        disabled={disabled}
        max={new Date().toISOString().split('T')[0]}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={endLabel}
      />
    </div>
  );
}
