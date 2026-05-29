export default function CardSection({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-card ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
