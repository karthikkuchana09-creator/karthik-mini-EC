import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo } from '../utils/format';

const TYPE_CONFIG = {
  task_assignment: { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', bg: 'bg-blue-100', fg: 'text-blue-600', label: 'Task' },
  task_status: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-indigo-100', fg: 'text-indigo-600', label: 'Status' },
  approval_request: { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-amber-100', fg: 'text-amber-600', label: 'Approval' },
  approval_action: { icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-emerald-100', fg: 'text-emerald-600', label: 'Approved' },
  comment: { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', bg: 'bg-teal-100', fg: 'text-teal-600', label: 'Comment' },
  document_upload: { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', bg: 'bg-cyan-100', fg: 'text-cyan-600', label: 'Document' },
  system: { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', bg: 'bg-gray-100', fg: 'text-gray-600', label: 'System' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'task_assignment', label: 'Tasks' },
  { key: 'approval_request', label: 'Approvals' },
  { key: 'comment', label: 'Comments' },
];

function NotificationDropdown({ open, onClose }) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter !== 'all') return n.type === filter;
    return true;
  });

  const list = filtered.slice(0, 6);
  const unreadTotal = notifications.filter((n) => !n.is_read).length;

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-[360px] bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-900/10 ring-1 ring-black/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          <p className="text-xs text-gray-400 mt-0.5">{unreadTotal} unread</p>
        </div>
        {unreadTotal > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-1 px-4 pt-3 pb-1 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-200 ${
              filter === tab.key
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[340px] overflow-y-auto">
        {list.length === 0 ? (
          <div className="text-center py-10 px-4">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm text-gray-400 font-medium">No notifications</p>
            <p className="text-xs text-gray-300 mt-1">
              {filter === 'unread' ? 'All caught up!' : 'Nothing to show'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {list.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
              return (
                <div
                  key={n.id}
                  className={`relative flex items-start gap-3 px-5 py-3.5 transition-all duration-200 group ${
                    n.is_read ? 'bg-white' : 'bg-indigo-50/40'
                  } ${i === 0 ? 'animate-in fade-in slide-in-from-top-1 duration-300' : ''}`}
                >
                  {!n.is_read && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />
                  )}
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <svg className={`w-4 h-4 ${cfg.fg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.fg}`}>{cfg.label}</span>
                      {n.type && (
                        <span className={`w-1.5 h-1.5 rounded-full ${n.is_read ? 'bg-gray-200' : 'bg-indigo-400'} ${!n.is_read ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {n.message || n.title || 'Notification'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at || n.timestamp)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                      title="Mark as read"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notifications.length > 6 && (
        <div className="border-t border-gray-100 p-2">
          <Link
            to="/notifications"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
          >
            View all notifications
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
