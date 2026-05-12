import { useState, useEffect } from 'react';
import { getAuditLogs } from '../api/audit_logs';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

const ACTION_CONFIG = {
  create: { color: 'bg-green-500', border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', label: 'Created' },
  update: { color: 'bg-blue-500', border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Updated' },
  delete: { color: 'bg-red-500', border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', label: 'Deleted' },
  upload: { color: 'bg-indigo-500', border: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Uploaded' },
  download: { color: 'bg-purple-500', border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', label: 'Downloaded' },
  approve: { color: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
  reject: { color: 'bg-red-500', border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
  assign: { color: 'bg-amber-500', border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Assigned' },
  login: { color: 'bg-gray-400', border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-600', label: 'Logged in' },
  comment: { color: 'bg-teal-500', border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-700', label: 'Commented' },
};

function getActionConfig(action) {
  return ACTION_CONFIG[action?.toLowerCase()] || { color: 'bg-gray-400', border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-600', label: action || 'Action' };
}

function ActivityFeed({ limit = 10, showViewAll = true, compact = false }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAuditLogs({ page_size: limit })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.logs || data.results || data.audit_logs || [];
        setActivities(list);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load activities');
      })
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[17px] top-3 bottom-3 w-px bg-gray-200" />

      <div className={`space-y-0 ${compact ? '' : ''}`}>
        {activities.map((a, i) => {
          const cfg = getActionConfig(a.action);
          const userEmail = a.user?.email || a.user_email || a.user || 'System';
          const entityLabel = a.entity || a.entity_type || '';
          const entityId = a.entity_id || a.entityId;

          return (
            <div key={a.id || i} className="relative flex items-start gap-4 pb-4 last:pb-0">
              <div className={`relative z-10 w-[34px] h-[34px] rounded-full ${cfg.bg} border-2 ${cfg.border} flex items-center justify-center shrink-0`}>
                <ActionIcon action={a.action} />
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{userEmail}</span>
                  <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                  {entityLabel && (
                    <span className="text-sm text-gray-600 truncate">
                      {entityLabel}{entityId ? ` #${entityId}` : ''}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${compact ? 'text-gray-400' : 'text-gray-400'} mt-0.5`}>
                  {timeAgo(a.created_at || a.timestamp)}
                  {compact && entityLabel ? ` · ${entityLabel}${entityId ? ` #${entityId}` : ''}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {showViewAll && activities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <a
            href="/audit-logs"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View all activity
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

function ActionIcon({ action }) {
  const cls = 'w-3.5 h-3.5';
  switch (action?.toLowerCase()) {
    case 'create':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
    case 'update':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
    case 'delete':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    case 'upload':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>;
    case 'download':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 14l5 5m0 0l5-5m-5 5V7" /></svg>;
    case 'approve':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
    case 'reject':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
    case 'assign':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    case 'comment':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
}

export default ActivityFeed;
