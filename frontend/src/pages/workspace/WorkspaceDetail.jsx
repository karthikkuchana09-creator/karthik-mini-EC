import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../api/workspaces';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';
import WorkspaceModal from '../../components/workspace/WorkspaceModal';
import ArchiveConfirmModal from '../../components/workspace/ArchiveConfirmModal';

const BANNER_COLORS = [
  'from-indigo-500 to-indigo-600',
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceId = Number(id);

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workspaceApi.getWorkspace(workspaceId);
      setWorkspace(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Workspace not found');
        navigate('/workspaces');
      } else {
        toast.error(getErrorMessage(err, 'Failed to load workspace'));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, navigate]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const handleUpdate = async (data) => {
    try {
      const updated = await workspaceApi.updateWorkspace(workspaceId, data);
      setWorkspace((prev) => ({ ...prev, ...updated }));
      toast.success('Workspace updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update workspace'));
      throw err;
    }
  };

  const handleArchive = async (ws) => {
    try {
      const updated = await workspaceApi.archiveWorkspace(ws.id);
      setWorkspace((prev) => ({ ...prev, ...updated, status: 'archived' }));
      toast.success('Workspace archived successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive workspace'));
      throw err;
    }
  };

  const handleRestore = async (ws) => {
    try {
      const updated = await workspaceApi.restoreWorkspace(ws.id);
      setWorkspace((prev) => ({ ...prev, ...updated, status: 'active' }));
      toast.success('Workspace restored successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to restore workspace'));
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  const isArchived = workspace.status === 'archived';
  const bannerColor = BANNER_COLORS[hashCode(workspace.name || workspace.id) % BANNER_COLORS.length];

  return (
    <div className="page-container max-w-4xl">
      <button
        onClick={() => navigate('/workspaces')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Workspaces
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className={`h-36 bg-gradient-to-br ${bannerColor} relative flex items-end p-6`}>
          {isArchived && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-gray-500">
              Archived
            </div>
          )}
          <div className="flex items-end gap-4 -mb-14">
            {workspace.avatar ? (
              <img src={workspace.avatar} alt={workspace.name} className="w-20 h-20 rounded-2xl ring-4 ring-white object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 ring-4 ring-white flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {workspace.name?.[0]?.toUpperCase() || 'W'}
                </span>
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">{workspace.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  workspace.visibility === 'Public' ? 'bg-emerald-100/90 text-emerald-800' : 'bg-amber-100/90 text-amber-800'
                }`}>
                  {workspace.visibility}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                  isArchived ? 'bg-gray-200/90 text-gray-600' : 'bg-emerald-100/90 text-emerald-800'
                }`}>
                  {workspace.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 p-6">
          {workspace.description && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{workspace.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created</h3>
              <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(workspace.created_at)}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Updated</h3>
              <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(workspace.updated_at)}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Workspace ID</h3>
              <p className="text-sm text-gray-900 tabular-nums font-mono">#{workspace.id}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={() => navigate(`/workspaces/${workspace.id}/members`)}
            className="btn-secondary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Members
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="btn-primary"
            disabled={isArchived}
            title={isArchived ? 'Cannot edit archived workspace' : undefined}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit
          </button>
          {isArchived ? (
            <button
              onClick={() => setArchiveTarget(workspace)}
              className="btn-secondary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Restore
            </button>
          ) : (
            <button
              onClick={() => setArchiveTarget(workspace)}
              className="btn-danger"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              Archive
            </button>
          )}
        </div>
      </div>

      <WorkspaceModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={handleUpdate}
        workspace={workspace}
      />

      <ArchiveConfirmModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={(ws) => (isArchived ? handleRestore(ws) : handleArchive(ws))}
        workspace={archiveTarget}
        action={isArchived ? 'restore' : 'archive'}
      />
    </div>
  );
}
