import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuditLogs } from '../api/audit_logs';
import { useWebSocketContext } from '../context/WebSocketContext';
import { timeAgo } from '../utils/format';

const ACTION_CONFIG = {
  create: { icon: 'plusCircle', color: 'bg-emerald-500', ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Created' },
  update: { icon: 'refreshCw', color: 'bg-blue-500', ring: 'ring-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Updated' },
  delete: { icon: 'trash2', color: 'bg-red-500', ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-red-700', label: 'Deleted' },
  upload: { icon: 'upload', color: 'bg-violet-500', ring: 'ring-violet-200', bg: 'bg-violet-50', text: 'text-violet-700', label: 'Uploaded' },
  download: { icon: 'download', color: 'bg-purple-500', ring: 'ring-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', label: 'Downloaded' },
  approve: { icon: 'checkCircle', color: 'bg-emerald-500', ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
  reject: { icon: 'xCircle', color: 'bg-red-500', ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
  assign: { icon: 'userPlus', color: 'bg-amber-500', ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Assigned' },
  login: { icon: 'logIn', color: 'bg-gray-400', ring: 'ring-gray-200', bg: 'bg-gray-50', text: 'text-gray-600', label: 'Logged in' },
  comment: { icon: 'messageSquare', color: 'bg-teal-500', ring: 'ring-teal-200', bg: 'bg-teal-50', text: 'text-teal-700', label: 'Commented' },
};

const WS_EVENT_CONFIG = {
  kanban: { action: 'update', entity_type: 'Task' },
  task: { action: 'update', entity_type: 'Task' },
  approval: { action: 'update', entity_type: 'Approval' },
  comment: { action: 'comment', entity_type: 'Comment' },
  document: { action: 'upload', entity_type: 'Document' },
};

function getActionConfig(action) {
  return ACTION_CONFIG[action?.toLowerCase()] || { icon: 'info', color: 'bg-gray-400', ring: 'ring-gray-200', bg: 'bg-gray-50', text: 'text-gray-600', label: action || 'Action' };
}

function initials(name) {
  if (!name) return 'S';
  const parts = name.split(/[@.\s_]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

function avatarColor(email) {
  if (!email) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ActivityIcon({ action, className = 'w-3.5 h-3.5' }) {
  switch (action?.toLowerCase()) {
    case 'create':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
    case 'update':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
    case 'delete':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    case 'upload':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>;
    case 'download':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 14l5 5m0 0l5-5m-5 5V7" /></svg>;
    case 'approve':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
    case 'reject':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
    case 'assign':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    case 'comment':
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
    default:
      return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
}

function ActivityFeed({ limit = 10, showViewAll = true, compact = false, realtime = true }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [indicator, setIndicator] = useState(null);
  const wsRef = useRef(null);
  const cleanupRef = useRef(null);
  const { subscribe } = useWebSocketContext();

  const dedupAndMerge = useCallback((existing, incoming) => {
    const existingIds = new Set(existing.map((a) => a.id));
    const deduped = incoming.filter((a) => !existingIds.has(a.id));
    const merged = [...deduped, ...existing];
    return merged.slice(0, limit);
  }, [limit]);

  const fromWsEvent = useCallback((event) => {
    const cfg = WS_EVENT_CONFIG[event.type] || {};
    const action = event.data?.action || cfg.action || 'update';
    const payload = event.data || {};
    return {
      id: `_ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      entity_type: payload.entity_type || cfg.entity_type || event.type,
      entity: payload.entity || payload.entity_type || '',
      entity_id: payload.entity_id || payload.id,
      user: payload.user || payload.assignee || { email: 'System' },
      user_email: payload.user?.email || payload.email || 'System',
      created_at: new Date().toISOString(),
      details: payload.title || payload.name || payload.description || '',
      _isNew: true,
    };
  }, []);

  const wsTypes = ['kanban', 'task', 'approval', 'comment', 'document'];

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    getAuditLogs({ page_size: limit, signal: abort.signal })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.logs || data.results || data.audit_logs || [];
        setActivities(list);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') setError(err.response?.data?.detail || 'Failed to load activities');
      })
      .finally(() => setLoading(false));
    return () => abort.abort();
  }, [limit]);

  useEffect(() => {
    if (!realtime) return;
    const subs = wsTypes.map((type) =>
      subscribe(type, (event) => {
        const entry = fromWsEvent(event);
        setIndicator(type);
        setTimeout(() => setIndicator(null), 2000);
        setActivities((prev) => {
          const merged = [entry, ...prev];
          if (merged.length > limit) merged.length = limit;
          return [...merged];
        });
        const t = setTimeout(() => {
          setActivities((prev) => prev.map((a) => (a.id === entry.id ? { ...a, _isNew: false } : a)));
        }, 3000);
        cleanupRef.current = t;
      })
    );
    return () => {
      subs.forEach((u) => u());
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
    };
  }, [realtime, limit, subscribe, fromWsEvent]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-3/4" />
              <div className="h-2.5 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2.5 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-10">
        <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-400">No recent activity</p>
        {realtime && indicator && (
          <p className="text-xs text-gray-300 mt-1">Waiting for live events...</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-gray-200 via-gray-100 to-transparent" />

      {indicator && (
        <div className="flex items-center gap-2 px-1 pb-3 text-xs text-indigo-500 font-medium animate-fadeIn">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          New {indicator} activity
        </div>
      )}

      <div className="space-y-0">
        {activities.map((a, i) => {
          const cfg = getActionConfig(a.action);
          const userLabel = a.user?.email || a.user_email || a.user?.name || 'System';
          const entityLabel = a.entity || a.entity_type || '';
          const entityId = a.entity_id || a.entityId;
          const isNew = a._isNew;
          const avatarCls = avatarColor(userLabel);

          return (
            <div
              key={a.id || i}
              className={`relative flex items-start gap-3 pb-3 last:pb-0 group transition-all duration-500 ${
                isNew ? 'animate-slideIn' : ''
              }`}
            >
              <div className={`relative z-10 w-[38px] h-[38px] rounded-full ${avatarCls} ring-2 ring-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <span className="text-[11px] font-semibold text-white leading-none select-none">
                  {initials(userLabel)}
                </span>
              </div>

              <div className="absolute left-[19px] top-[38px] bottom-0 w-px" />

              <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{userLabel}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium leading-none ${cfg.bg} ${cfg.text}`}>
                    <ActivityIcon action={a.action} className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  {entityLabel && (
                    <span className="text-sm text-gray-500 truncate">
                      {entityLabel}{entityId ? ` #${entityId}` : ''}
                    </span>
                  )}
                </div>

                {a.details && !compact && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{a.details}</p>
                )}

                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] ${isNew ? 'text-indigo-500 font-medium' : 'text-gray-400'}`}>
                    {timeAgo(a.created_at || a.timestamp)}
                  </span>
                  {isNew && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showViewAll && activities.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <a
            href="/audit-logs"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
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

export default ActivityFeed;
