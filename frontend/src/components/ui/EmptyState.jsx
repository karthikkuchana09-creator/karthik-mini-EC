export default function EmptyState({
  icon,
  title = 'Nothing here yet',
  description = '',
  action,
  compact = false,
  className = '',
}) {
  return (
    <div className={`text-center ${compact ? 'py-8' : 'py-16'} ${className}`}>
      {icon || (
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <p className={`text-gray-500 font-semibold ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && (
        <p className={`text-gray-400 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}
      {action && (
        <div className="mt-5">{action}</div>
      )}
    </div>
  );
}
