import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../api/workspaces';
import { getErrorMessage } from '../../utils/errorHandler';
import MembersTable from '../../components/workspace/MembersTable';
import AddMemberModal from '../../components/workspace/AddMemberModal';

const BANNER_COLORS = [
  'from-indigo-500 to-indigo-600', 'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600', 'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600', 'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-600', 'from-orange-500 to-orange-600',
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

export default function WorkspaceMembers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceId = Number(id);

  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, m] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        workspaceApi.getWorkspaceMembers(workspaceId),
      ]);
      setWorkspace(ws);
      setMembers(Array.isArray(m) ? m : m?.members || []);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Workspace not found');
        navigate('/workspaces');
      } else {
        toast.error(getErrorMessage(err, 'Failed to load workspace members'));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (data) => {
    try {
      const added = await workspaceApi.addWorkspaceMember(workspaceId, data);
      setMembers((prev) => [...prev, added]);
      toast.success('Member added successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add member'));
      throw err;
    }
  };

  const handleRoleChange = async (member, newRole) => {
    const prevRole = member.role;
    setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, role: newRole } : m)));
    try {
      await workspaceApi.updateMemberRole(workspaceId, member.user_id, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, role: prevRole } : m)));
      toast.error(getErrorMessage(err, 'Failed to update role'));
    }
  };

  const handleRemove = async (member) => {
    setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    try {
      await workspaceApi.removeWorkspaceMember(workspaceId, member.user_id);
      toast.success('Member removed successfully');
    } catch (err) {
      setMembers((prev) => [...prev, member]);
      toast.error(getErrorMessage(err, 'Failed to remove member'));
    }
  };

  const q = search.toLowerCase();
  const filtered = members.filter(
    (m) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
  );

  const existingEmails = members.map((m) => m.email);

  const bannerColor = BANNER_COLORS[workspace ? hashCode(workspace.name || workspace.id) % BANNER_COLORS.length : 0];
  const isArchived = workspace?.status === 'archived';

  return (
    <div className="page-container max-w-4xl">
      <button
        onClick={() => navigate(`/workspaces/${workspaceId}`)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Workspace
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className={`h-24 bg-gradient-to-br ${bannerColor} p-5 flex items-end`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 ring-2 ring-white/40 flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {workspace?.name?.[0]?.toUpperCase() || 'W'}
              </span>
            </div>
            <div className="pb-0.5">
              <h1 className="text-lg font-bold text-white drop-shadow-sm">{workspace?.name || 'Workspace'} Members</h1>
              <p className="text-xs text-white/80">
                {members.length} member{members.length !== 1 ? 's' : ''} &middot; {workspace?.visibility || 'Private'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="input pl-10"
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="btn-primary"
              disabled={isArchived}
              title={isArchived ? 'Cannot add members to archived workspace' : undefined}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              Add Member
            </button>
          </div>

          {search && filtered.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No members match your search</p>
              <p className="text-xs text-gray-400 mt-1">Try a different name or email</p>
            </div>
          ) : (
            <MembersTable
              members={filtered}
              onRoleChange={handleRoleChange}
              onRemove={handleRemove}
              loading={loading}
            />
          )}

          {!search && !loading && members.length > 0 && (
            <div className="mt-4 text-xs text-gray-400 text-center">
              Showing {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <AddMemberModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAdd}
        existingMemberEmails={existingEmails}
      />
    </div>
  );
}
