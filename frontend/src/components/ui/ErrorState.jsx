export default function ErrorState({
  message = 'Something went wrong',
  onRetry,
  compact = false,
  className = '',
}) {
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} ${className}`}>
      <div className={`rounded-xl border ${
        compact ? 'bg-red-50 border-red-200/70 p-4' : 'bg-red-50 border-red-200/70 p-6'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`rounded-lg bg-red-100 flex items-center justify-center shrink-0 ${
            compact ? 'w-8 h-8' : 'w-10 h-10'
          }`}>
            <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-red-800 ${compact ? 'text-sm' : 'text-sm'}`}>Failed to load data</p>
            <p className={`text-red-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-white text-red-700 border border-red-200 hover:bg-red-50 transition-all duration-200 active:scale-95 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
