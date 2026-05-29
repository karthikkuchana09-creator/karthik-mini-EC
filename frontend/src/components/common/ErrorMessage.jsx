import { useState } from 'react';
import {
  FiAlertCircle, FiRefreshCw, FiChevronDown, FiChevronUp,
  FiShield, FiWifi, FiClock, FiAlertTriangle, FiXCircle,
} from 'react-icons/fi';
import { getErrorTitle, getErrorStatus } from '../../utils/errorHandler';

const ERROR_ICONS = {
  401: FiShield,
  403: FiShield,
  404: FiXCircle,
  422: FiAlertTriangle,
  500: FiAlertCircle,
  network: FiWifi,
  timeout: FiClock,
};

const ERROR_COLORS = {
  401: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
  403: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
  404: { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-gray-200' },
  422: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
  500: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
};

export default function ErrorMessage({
  message = 'Something went wrong.',
  onRetry,
  fullPage = false,
  className = '',
  error,
  title,
  dismissible = false,
  onDismiss,
  compact = false,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const status = error ? getErrorStatus(error) : 0;
  const resolvedTitle = title || (error ? getErrorTitle(error) : 'Error');
  const Icon = ERROR_ICONS[status] || ERROR_ICONS[500] || FiAlertCircle;
  const colors = ERROR_COLORS[status] || { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' };

  const detailText = error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    (typeof error === 'string' ? error : null);

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${colors.bg} border ${colors.border} ${className}`} role="alert">
        <Icon className={`w-4 h-4 flex-shrink-0 ${colors.icon}`} />
        <p className="text-sm text-gray-700 flex-1">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex-shrink-0">
            Retry
          </button>
        )}
        {dismissible && (
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Dismiss">
            <FiXCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const content = (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`} role="alert">
      <div className={`p-3 rounded-full ${colors.bg} mb-4`}>
        <Icon className={`w-6 h-6 ${colors.icon}`} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{resolvedTitle}</h3>
      <p className="text-sm text-gray-600 text-center max-w-md mb-4">{message}</p>

      {detailText && (
        <div className="w-full max-w-md mb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showDetails ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          {showDetails && (
            <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 overflow-x-auto border border-gray-200 whitespace-pre-wrap max-h-48">
              {typeof detailText === 'string' ? detailText : JSON.stringify(detailText, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary">
            <FiRefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
        {dismissible && (
          <button onClick={handleDismiss} className="btn-ghost text-sm text-gray-500 hover:text-gray-700">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return <div className="flex items-center justify-center min-h-[60vh]">{content}</div>;
  }

  return content;
}
