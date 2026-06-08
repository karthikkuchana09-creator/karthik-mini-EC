import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../api/workspaces';
import { getErrorMessage } from '../../utils/errorHandler';
import WorkspaceCard from '../../components/workspace/WorkspaceCard';
import WorkspaceTable from '../../components/workspace/WorkspaceTable';
import WorkspaceModal from '../../components/workspace/WorkspaceModal';
import ArchiveConfirmModal from '../../components/workspace/ArchiveConfirmModal';

const VIEW_ICONS = {
  grid: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  list: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
};

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workspaceApi.getWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : data?.workspaces || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load workspaces'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (data) => {
    try {
      const created = await workspaceApi.createWorkspace(data);
      setWorkspaces((prev) => [...prev, created]);
      toast.success('Workspace created successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create workspace'));
      throw err;
    }
  };

  const handleArchive = async (ws) => {
    try {
      const updated = await workspaceApi.archiveWorkspace(ws.id);
      setWorkspaces((prev) => prev.map((w) => (w.id === ws.id ? { ...w, ...updated, status: 'archived' } : w)));
      toast.success('Workspace archived successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive workspace'));
      throw err;
    }
  };

  const handleRestore = async (ws) => {
    try {
      const updated = await workspaceApi.restoreWorkspace(ws.id);
      setWorkspaces((prev) => prev.map((w) => (w.id === ws.id ? { ...w, ...updated, status: 'active' } : w)));
      toast.success('Workspace restored successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to restore workspace'));
      throw err;
    }
  };

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
          <p className="page-subtitle">
            Manage workspaces across your organization
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
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
          <input
            className="input pl-10"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-gray-400">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {['grid', 'list'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`p-1.5 rounded-md transition-all ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
                title={v === 'grid' ? 'Card view' : 'Table view'}
              >
                {VIEW_ICONS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
                  <div className="h-20 bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">
            {search ? 'No workspaces match your search' : 'No workspaces yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'Create your first workspace to get started'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Create Workspace
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onArchive={(w) => setArchiveTarget(w)}
              onRestore={handleRestore}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <WorkspaceTable
            workspaces={filtered}
            onArchive={(w) => setArchiveTarget(w)}
            onRestore={handleRestore}
          />
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Showing {filtered.length} of {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
      </div>

      <WorkspaceModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />

      <ArchiveConfirmModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={(ws) => handleArchive(ws)}
        workspace={archiveTarget}
        action="archive"
      />
    </div>
  );
}
