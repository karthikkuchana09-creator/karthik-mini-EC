export default function LoadingSpinner({ size = 'md', text = 'Loading...', fullPage = false, className = '', overlay = false }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const textSizeMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${text ? 'gap-3' : ''}`} role="status" aria-live="polite">
      <svg className={`animate-spin ${sizeMap[size]} text-indigo-600`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text && <p className={`${textSizeMap[size]} text-gray-500`}>{text}</p>}
    </div>
  );

  if (fullPage) {
    return <div className={`flex items-center justify-center min-h-[60vh] ${className}`}>{spinner}</div>;
  }

  if (overlay) {
    return (
      <div className={`absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 ${className}`}>
        {spinner}
      </div>
    );
  }

  return <div className={className}>{spinner}</div>;
}
