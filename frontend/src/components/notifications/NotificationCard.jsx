import { FiBell, FiCheck, FiMail, FiMessageSquare, FiAlertCircle } from 'react-icons/fi';

const typeIcons = {
  approval: FiCheck,
  task_assigned: FiMail,
  comment: FiMessageSquare,
  alert: FiAlertCircle,
  default: FiBell,
};

const typeColors = {
  approval: 'text-green-600 bg-green-100',
  task_assigned: 'text-blue-600 bg-blue-100',
  comment: 'text-purple-600 bg-purple-100',
  alert: 'text-red-600 bg-red-100',
  default: 'text-gray-600 bg-gray-100',
};

export default function NotificationCard({ notification, onMarkRead }) {
  const Icon = typeIcons[notification.type] || typeIcons.default;
  const color = typeColors[notification.type] || typeColors.default;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${notification.is_read ? 'bg-white' : 'bg-indigo-50/50'}`}>
      <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
          {notification.title}
        </p>
        {notification.message && <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>}
        <p className="text-xs text-gray-400 mt-1">{notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}</p>
      </div>
      {!notification.is_read && onMarkRead && (
        <button
          onClick={() => onMarkRead(notification.id)}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
          title="Mark as read"
        >
          <FiCheck className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
