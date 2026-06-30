export default function TaskProgressBar({ value, max, color = 'bg-indigo-500', size = 'h-1.5', showLabel, className = '' }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-gray-100 rounded-full ${size}`}>
        <div className={`${color} ${size} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{pct}%</span>}
    </div>
  );
}
