import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/notifications';
import { timeAgo } from '../utils/format';
import { SkeletonNotificationCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  all: { label: 'All', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  task_assignment: { label: 'Task', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', bg: 'bg-blue-100', fg: 'text-blue-600' },
  task_status: { label: 'Status', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-indigo-100', fg: 'text-indigo-600' },
  approval_request: { label: 'Approval', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-amber-100', fg: 'text-amber-600' },
  approval_action: { label: 'Approved', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-emerald-100', fg: 'text-emerald-600' },
  comment: { label: 'Comment', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', bg: 'bg-teal-100', fg: 'text-teal-600' },
  document_upload: { label: 'Document', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', bg: 'bg-cyan-100', fg: 'text-cyan-600' },
  ai_alert: { label: 'AI Alert', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z', bg: 'bg-violet-100', fg: 'text-violet-600' },
  system: { label: 'System', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', bg: 'bg-gray-100', fg: 'text-gray-600' },
};

const FILTERS = Object.entries(TYPE_CONFIG);

function Notifications() {
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const pageSize = 15;

  const extractList = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: pageSize };
      if (filter !== 'all') params.category = filter;
      const data = await api.getNotifications(params);
      setAllNotifications(extractList(data, 'items', 'results', 'notifications'));
      setTotal(data?.total ?? extractList(data, 'items', 'results', 'notifications').length);
      setTotalPages(data?.total ? Math.ceil(data.total / pageSize) : 1);
    } catch {}
    setLoading(false);
  }, [page, filter]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getNotificationStats();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => { fetchNotifications(); fetchStats(); }, [fetchNotifications, fetchStats]);

  useEffect(() => { setPage(1); setSelected(new Set()); setSelectMode(false); }, [filter]);

  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setAllNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {}
  };

  const handleBulkMarkRead = async () => {
    setActionLoading(true);
    try {
      await api.markMultipleNotificationsRead(Array.from(selected));
      setAllNotifications((prev) => prev.map((n) => selected.has(n.id) ? { ...n, is_read: true } : n));
      setSelected(new Set());
      toast.success(`${selected.size} marked as read`);
    } catch { toast.error('Failed to mark as read'); }
    setActionLoading(false);
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await api.markAllNotificationsRead();
      setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSelected(new Set());
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all as read'); }
    setActionLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      setAllNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === allNotifications.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allNotifications.map((n) => n.id)));
    }
  };

  const filteredNotifications = allNotifications;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread of ${total} total` : `${total} total · All caught up`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-200 shadow-sm active:scale-[0.97] disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map(([key, cfg]) => {
            const count = key === 'all'
              ? (stats?.total ?? 0)
              : (stats?.by_category?.find((c) => c.type === key)?.count ?? 0);
            const unread = key === 'all'
              ? (stats?.unread ?? 0)
              : null;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 shrink-0 ${
                  filter === key
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {key !== 'all' && (
                  <span className={`w-6 h-6 rounded-md ${cfg.bg || 'bg-gray-100'} flex items-center justify-center`}>
                    <svg className={`w-3 h-3 ${cfg.fg || 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                    </svg>
                  </span>
                )}
                <span>{cfg.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  filter === key ? 'bg-indigo-200/50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
                {unread !== null && unread > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-sm font-medium text-indigo-700">{selected.size} selected</span>
          <button
            onClick={handleBulkMarkRead}
            disabled={actionLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Mark read
          </button>
          <button
            onClick={() => { setSelected(new Set()); setSelectMode(false); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonNotificationCard key={i} />)}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm">
          <EmptyState
            icon={
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            }
            title={filter === 'all' ? 'No notifications yet' : `No ${TYPE_CONFIG[filter]?.label?.toLowerCase() || ''} notifications`}
            description={filter === 'all' ? 'Notifications will appear here in real time.' : 'Try a different filter.'}
          />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filteredNotifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
              return (
                <div
                  key={n.id}
                  className={`group relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                    selectMode ? 'cursor-pointer' : ''
                  } ${
                    selected.has(n.id)
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                      : n.is_read
                        ? 'bg-white border-gray-200/70 shadow-sm hover:shadow-md'
                        : 'bg-gradient-to-r from-indigo-50/80 to-white border-indigo-200/60 shadow-sm hover:shadow-lg'
                  }`}
                >
                  {selectMode ? (
                    <div className="flex items-center h-full pt-0.5">
                      <input
                        type="checkbox"
                        checked={selected.has(n.id)}
                        onChange={() => toggleSelect(n.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    !n.is_read && (
                      <span className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl shadow-sm shadow-indigo-500/30" />
                    )
                  )}

                  <div className={`w-9 h-9 rounded-xl ${cfg.bg || 'bg-gray-100'} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                    <svg className={`w-4.5 h-4.5 ${cfg.fg || 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.fg || 'text-gray-500'}`}>{cfg.label}</span>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-sm shadow-indigo-500/40" />
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {n.message || n.title || 'Notification'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-gray-400">{timeAgo(n.created_at || n.timestamp)}</p>
                      {n.type && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          {n.type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 shrink-0 ${n.is_read ? 'opacity-0 group-hover:opacity-100' : ''} focus:opacity-100 transition-opacity duration-200`}>
                    {!n.is_read && !selectMode && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                        title="Mark as read"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                          page === p
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Notifications;
