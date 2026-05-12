import { useNotifications } from '../context/NotificationContext';
import { SkeletonNotificationCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function Notifications() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonNotificationCard key={i} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white/50 rounded-2xl border border-gray-200/50">
          <EmptyState
            title="No notifications yet"
            description="Notifications will appear here in real time."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`group relative flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                n.is_read
                  ? 'bg-white border-gray-200/70 shadow-sm hover:shadow-md'
                  : 'bg-gradient-to-r from-indigo-50/80 to-white border-indigo-200/60 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5'
              }`}
            >
              {!n.is_read && (
                <span className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl shadow-sm shadow-indigo-500/30" />
              )}
              <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ring-2 ring-white ${
                n.is_read
                  ? 'bg-gray-300'
                  : 'bg-indigo-500 shadow-sm shadow-indigo-500/30'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                  {n.message || n.title || 'Notification'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-xs text-gray-400">{timeAgo(n.created_at || n.timestamp)}</p>
                  {!n.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 active:scale-95 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
