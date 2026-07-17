import { useState, useEffect, useCallback } from 'react';
import { getAuditLogs, getAuditLogById } from '../api/audit_logs';
import { useDebounce } from '../hooks/useDebounce';
import { SkeletonTableRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';

const MODULE_OPTIONS = [
  { value: '', label: 'All Modules' },
  { value: 'task', label: 'Task' },
  { value: 'user', label: 'User' },
  { value: 'approval', label: 'Approval' },
  { value: 'document', label: 'Document' },
  { value: 'comment', label: 'Comment' },
  { value: 'organization', label: 'Organization' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'notification_rule', label: 'Notification Rule' },
  { value: 'knowledge_base', label: 'Knowledge Base' },
  { value: 'custom_form', label: 'Custom Form' },
  { value: 'report', label: 'Report' },
  { value: 'search', label: 'Search' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'saved_search', label: 'Saved Search' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'view', label: 'View' },
  { value: 'upload', label: 'Upload' },
  { value: 'download', label: 'Download' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'assign', label: 'Assign' },
  { value: 'export', label: 'Export' },
];

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700 border-green-200',
  update: 'bg-blue-100 text-blue-700 border-blue-200',
  delete: 'bg-red-100 text-red-700 border-red-200',
  view: 'bg-gray-100 text-gray-700 border-gray-200',
  upload: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  download: 'bg-purple-100 text-purple-700 border-purple-200',
  login: 'bg-gray-100 text-gray-700 border-gray-200',
  logout: 'bg-gray-100 text-gray-700 border-gray-200',
  approve: 'bg-green-100 text-green-700 border-green-200',
  reject: 'bg-red-100 text-red-700 border-red-200',
  assign: 'bg-amber-100 text-amber-700 border-amber-200',
  export: 'bg-orange-100 text-orange-700 border-orange-200',
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function formatTimestamp(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tryParseJson(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${color}`}>
      {action || '-'}
    </span>
  );
}

function ModuleBadge({ module }) {
  const formatted = module ? module.replace(/_/g, ' ') : '-';
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
      {formatted}
    </span>
  );
}

function JsonBlock({ data, label }) {
  const parsed = tryParseJson(data);
  if (parsed === null || parsed === undefined) return null;
  const formatted = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-48 leading-relaxed font-mono">
        {formatted}
      </pre>
    </div>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);

  const [filters, setFilters] = useState({
    module: '',
    actionType: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);

  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, size: perPage };
        if (filters.module) params.module_name = filters.module;
        if (filters.actionType) params.action_type = filters.actionType;
        if (filters.userId) params.user_id = parseInt(filters.userId, 10) || filters.userId;
        if (filters.dateFrom) params.date_from = new Date(filters.dateFrom).toISOString();
        if (filters.dateTo) params.date_to = new Date(filters.dateTo).toISOString();
        if (debouncedSearch) params.q = debouncedSearch;
        const data = await getAuditLogs(params);
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data.items || data.logs || data.results || data.audit_logs || [];
        setLogs(list);
        const totalItems = data.total || data.count || list.length;
        setTotal(totalItems);
        setTotalPages(data.pages || data.total_pages || Math.ceil(totalItems / perPage) || 1);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'Failed to load audit logs');
        setLogs([]);
      }
      setLoading(false);
    };
    fetchLogs();
    return () => { cancelled = true; };
  }, [page, filters, debouncedSearch, perPage, retryKey]);

  useEffect(() => {
    if (!detailId) { setDetailData(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    getAuditLogById(detailId)
      .then((data) => { if (!cancelled) setDetailData(data); })
      .catch(() => { if (!cancelled) setDetailData(null); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailId]);

  const clearFilters = () => {
    setFilters({ module: '', actionType: '', userId: '', dateFrom: '', dateTo: '' });
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters = filters.module || filters.actionType || filters.userId || filters.dateFrom || filters.dateTo || debouncedSearch;

  const handlePerPageChange = (e) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Track all system activities and changes across the platform</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by user, action, entity..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={filters.module}
            onChange={(e) => updateFilter('module', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filters.actionType}
            onChange={(e) => updateFilter('actionType', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={filters.userId}
            onChange={(e) => updateFilter('userId', e.target.value)}
            placeholder="User ID..."
            className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              title="From date"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              title="To date"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <SkeletonTableRows rows={8} cols={7} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setRetryKey((k) => k + 1)} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
            title={hasActiveFilters ? 'No matching logs' : 'No audit logs found'}
            description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Audit logs will appear here as actions are performed.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold ring-2 ring-white shrink-0">
                            {(log.user?.email || log.user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm text-gray-900 block truncate">{log.user?.email || log.user?.name || 'Unknown'}</span>
                            {log.user_id && <span className="text-xs text-gray-400">#{log.user_id}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-6 py-4">
                        <ModuleBadge module={log.module_name || log.entity} />
                        {log.entity && log.module_name && log.entity !== log.module_name && (
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{log.entity}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-gray-600 font-mono">{log.entity_id ?? '-'}</code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-500 font-mono">{log.ip_address || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDetailId(log.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                  {total > 0 && <span className="ml-1">({total.toLocaleString()} total)</span>}
                </p>
                <select
                  value={perPage}
                  onChange={handlePerPageChange}
                  className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const n = start + i;
                  if (n > totalPages) return null;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                        n === page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={!!detailId}
        onClose={() => { setDetailId(null); setDetailData(null); }}
        title="Audit Log Details"
        size="full"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">User:</span>
                  <span className="font-medium text-gray-900">
                    {detailData.user?.name || detailData.user?.email || `User #${detailData.user_id}` || 'System'}
                  </span>
                </div>
                {detailData.user?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-24 shrink-0">Email:</span>
                    <span className="text-gray-700">{detailData.user.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">Action:</span>
                  <ActionBadge action={detailData.action} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">Module:</span>
                  <ModuleBadge module={detailData.module_name || detailData.entity} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">Entity:</span>
                  <span className="text-sm text-gray-700 capitalize">{detailData.entity || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">Entity ID:</span>
                  <code className="font-mono text-sm text-gray-900">{detailData.entity_id ?? '-'}</code>
                </div>
                {detailData.action_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-24 shrink-0">Action Type:</span>
                    <span className="text-gray-700 capitalize">{detailData.action_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {detailData.record_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-24 shrink-0">Record ID:</span>
                    <code className="font-mono text-sm text-gray-900">{detailData.record_id}</code>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">Timestamp:</span>
                  <span className="font-medium text-gray-900">{formatTimestamp(detailData.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">IP Address:</span>
                  <code className="font-mono text-sm text-gray-900">{detailData.ip_address || '-'}</code>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">User Agent:</span>
                  <p className="font-mono text-xs text-gray-700 break-all max-w-xs">{detailData.user_agent || '-'}</p>
                </div>
              </div>
            </div>

            {(detailData.old_data || detailData.old_value || detailData.new_data || detailData.new_value) && (
              <div className="border-t border-gray-200 pt-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Data Changes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <JsonBlock data={detailData.old_data ?? detailData.old_value} label="Old Data" />
                  <JsonBlock data={detailData.new_data ?? detailData.new_value} label="New Data" />
                </div>
              </div>
            )}

            {detailData.metadata && (
              <div className="border-t border-gray-200 pt-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Metadata</h4>
                <JsonBlock data={detailData.metadata} label="Metadata" />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setDetailId(null); setDetailData(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">Unable to load audit log details.</div>
        )}
      </Modal>
    </div>
  );
}
