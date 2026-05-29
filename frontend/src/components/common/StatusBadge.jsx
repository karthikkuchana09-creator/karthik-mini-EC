import { FiCircle } from 'react-icons/fi';
import { STATUS_CONFIG, PRIORITY_CONFIG, APPROVAL_STATUS_CONFIG } from '../../config/ui';

const configs = { ...STATUS_CONFIG, ...PRIORITY_CONFIG, ...APPROVAL_STATUS_CONFIG };

export default function StatusBadge({ status, type = 'status', size = 'sm', className = '' }) {
  const config = configs[status];
  if (!config) {
    return (
      <span className={`badge-neutral ${className}`} role="status" aria-label={`Status: ${status}`}>
        {status}
      </span>
    );
  }

  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-sm gap-1.5' : 'px-2.5 py-1 text-xs gap-1';

  return (
    <span
      className={`inline-flex items-center ${sizeClasses} rounded-full font-semibold border ${config.badge || config.pill || 'bg-gray-100 text-gray-700 border-gray-200'} ${className}`}
      role="status"
      aria-label={`${type}: ${config.label || status}`}
    >
      {config.dot && <FiCircle className={`w-1.5 h-1.5 ${config.dot} fill-current`} />}
      {config.label || status}
    </span>
  );
}
