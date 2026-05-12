import { useState, useEffect } from 'react';
import { getAuditLogs } from '../api/audit_logs';
import { SkeletonTableRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'task', label: 'Task' },
  { value: 'user', label: 'User' },
  { value: 'approval', label: 'Approval' },
  { value: 'document', label: 'Document' },
  { value: 'comment', label: 'Comment' },
];

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

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const perPage = 20;

  const fetchLogs = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: p, page_size: perPage };
      if (entity) params.entity = entity;
      const data = await getAuditLogs(params);
      const list = Array.isArray(data) ? data : data.items || data.logs || data.results || data.audit_logs || [];
      setLogs(list);
      const totalItems = data.total || data.count || list.length;
      setTotal(totalItems);
      setTotalPages(data.total_pages || data.pages || Math.ceil(totalItems / perPage) || 1);
      if (p > (data.total_pages || data.pages || 1)) setPage(1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load audit logs');
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page, entity, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleEntityChange = (val) => {
    setEntity(val);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Track all system activities and changes</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <form onSubmit={handleSearch}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by user..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </form>
        </div>
        <select
          value={entity}
          onChange={(e) => handleEntityChange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          {ENTITY_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {search && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <SkeletonTableRows rows={8} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchLogs(page)} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
            title={search || entity ? 'No matching logs' : 'No audit logs found'}
            description={search || entity ? 'Try adjusting your search or filter.' : 'Audit logs will appear here as actions are performed.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold ring-2 ring-white shrink-0">
                            {(log.user?.email || log.user_email || log.user || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">{log.user?.email || log.user_email || log.user || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {log.entity || log.entity_type || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-gray-600 font-mono">{log.entity_id || log.entityId || '-'}</code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatTimestamp(log.created_at || log.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                  {total > 0 && <span className="ml-1">({total} total)</span>}
                </p>
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }) {
  const colorMap = {
    create: 'bg-green-100 text-green-700 border-green-200',
    update: 'bg-blue-100 text-blue-700 border-blue-200',
    delete: 'bg-red-100 text-red-700 border-red-200',
    upload: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    download: 'bg-purple-100 text-purple-700 border-purple-200',
    login: 'bg-gray-100 text-gray-700 border-gray-200',
    logout: 'bg-gray-100 text-gray-700 border-gray-200',
    approve: 'bg-green-100 text-green-700 border-green-200',
    reject: 'bg-red-100 text-red-700 border-red-200',
    assign: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const color = colorMap[action?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${color}`}>
      {action || '-'}
    </span>
  );
}

export default AuditLogs;
