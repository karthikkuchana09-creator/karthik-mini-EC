import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../api/workspaces';
import { getErrorMessage } from '../../utils/errorHandler';

const STATUS_CONFIG = {
  active: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  archived: { bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
};

export default function WorkspaceList() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workspaceApi.getWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : data?.workspaces || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load workspaces'));
      toast.error(getErrorMessage(err, 'Failed to load workspaces'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const filtered = workspaces.filter((ws) => {
    const q = search.toLowerCase();
    if (q && !ws.name?.toLowerCase().includes(q) && !ws.description?.toLowerCase().includes(q)) return false;
    if (filter === 'active') return ws.status !== 'archived';
    if (filter === 'archived') return ws.status === 'archived';
    return true;
  });

  const activeCount = workspaces.filter((w) => w.status !== 'archived').length;
  const archivedCount = workspaces.filter((w) => w.status === 'archived').length;

  const FILTER_TABS = [
    { key: 'all', label: 'All', count: workspaces.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'archived', label: 'Archived', count: archivedCount },
  ];

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Workspaces</h1>
          <p className="page-subtitle">Manage workspaces across your organization</p>
        </div>
        <button onClick={() => navigate('/workspaces/new')} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Workspace
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="input pl-10" placeholder="Search workspaces..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
              <span className="ml-1 text-gray-400">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
              <div className="h-20 bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-3 rounded-full bg-red-50 mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Failed to load</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button onClick={fetchWorkspaces} className="btn-secondary text-sm">Try Again</button>
          </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">{search ? 'No workspaces match your search' : 'No workspaces yet'}</p>
          <p className="text-xs text-gray-400 mt-1">{search ? 'Try a different search term' : 'Create your first workspace to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ws) => {
            const cfg = STATUS_CONFIG[ws.status === 'archived' ? 'archived' : 'active'];
            return (
              <Link key={ws.id} to={`/workspaces/${ws.id}`} className="block bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-300/80 transition-all overflow-hidden group">
                <div className="h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 relative">
                  {ws.status === 'archived' && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-semibold text-gray-500">Archived</div>
                  )}
                  <div className="absolute -bottom-8 left-4 w-16 h-16 rounded-2xl bg-white/20 ring-4 ring-white flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">{ws.name?.[0]?.toUpperCase() || 'W'}</span>
                  </div>
                </div>
                <div className="pt-10 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{ws.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ws.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {ws.status || 'active'}
                    </span>
                    <span className="text-[10px] text-gray-400">{ws.visibility || 'Private'}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Showing {filtered.length} of {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
