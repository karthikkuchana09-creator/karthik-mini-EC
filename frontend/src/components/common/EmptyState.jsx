import { FiInbox, FiSearch, FiFilter, FiTarget, FiCheckCircle, FiUsers, FiFileText, FiFolder } from 'react-icons/fi';

const PRESETS = {
  noRecords: {
    icon: FiInbox,
    title: 'No records found',
    message: 'There are no records to display yet.',
  },
  noResults: {
    icon: FiSearch,
    title: 'No results',
    message: 'No results match your search criteria.',
  },
  noFilters: {
    icon: FiFilter,
    title: 'No matching data',
    message: 'Try adjusting your filters to see more results.',
  },
  noTasks: {
    icon: FiTarget,
    title: 'No tasks',
    message: 'No tasks have been created yet.',
  },
  noApprovals: {
    icon: FiCheckCircle,
    title: 'No approvals',
    message: 'No approval requests are pending.',
  },
  noNotifications: {
    icon: FiInbox,
    title: 'All caught up',
    message: 'You have no unread notifications.',
  },
  noUsers: {
    icon: FiUsers,
    title: 'No users',
    message: 'No users match your criteria.',
  },
  noDocuments: {
    icon: FiFolder,
    title: 'No documents',
    message: 'No documents have been uploaded yet.',
  },
  noAuditLogs: {
    icon: FiFileText,
    title: 'No audit logs',
    message: 'No audit log entries match your criteria.',
  },
};

export default function EmptyState({
  icon,
  title = 'No data',
  message = 'There is nothing to display yet.',
  action,
  className = '',
  size = 'md',
  preset,
}) {
  if (preset && PRESETS[preset]) {
    const p = PRESETS[preset];
    icon = icon || p.icon;
    title = title || p.title;
    message = message || p.message;
  }

  const Icon = icon || FiInbox;

  const sizeMap = {
    sm: { icon: 'w-6 h-6', wrapper: 'p-3', title: 'text-base', message: 'text-xs', py: 'py-10' },
    md: { icon: 'w-8 h-8', wrapper: 'p-4', title: 'text-lg', message: 'text-sm', py: 'py-16' },
    lg: { icon: 'w-12 h-12', wrapper: 'p-5', title: 'text-xl', message: 'text-sm', py: 'py-20' },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex flex-col items-center justify-center ${s.py} px-4 ${className}`} role="status">
      <div className={`${s.wrapper} rounded-full bg-gray-100 mb-4`}>
        <Icon className={`${s.icon} text-gray-400`} aria-hidden="true" />
      </div>
      <h3 className={`${s.title} font-semibold text-gray-900 mb-1`}>{title}</h3>
      <p className={`${s.message} text-gray-500 text-center max-w-sm mb-4`}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
