import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

const TREND_ICONS = {
  up: FiTrendingUp,
  down: FiTrendingDown,
  neutral: FiMinus,
};

const TREND_COLORS = {
  up: 'text-green-600 bg-green-50 border-green-200',
  down: 'text-red-600 bg-red-50 border-red-200',
  neutral: 'text-gray-600 bg-gray-50 border-gray-200',
};

export default function AnalyticsCard({ label, value, trend, subtitle, icon: Icon, gradient = 'from-indigo-500 to-violet-500', className = '' }) {
  const TrendIcon = TREND_ICONS[trend?.direction];
  const trendColor = TREND_COLORS[trend?.direction];

  return (
    <div className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value ?? '-'}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
