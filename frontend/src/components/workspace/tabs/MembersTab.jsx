import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../../api/workspaces';
import { getErrorMessage } from '../../../utils/errorHandler';

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-indigo-600', 'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600', 'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600', 'from-cyan-500 to-blue-600',
  'from-lime-500 to-green-600', 'from-fuchsia-500 to-pink-600',
];

const ROLE_STYLES = {
  WORKSPACE_ADMIN: { bg: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-200', label: 'Admin' },
  MODERATOR: { bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-200', label: 'Moderator' },
  MEMBER: { bg: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-200', label: 'Member' },
  VIEWER: { bg: 'bg-gray-100 text-gray-600 border-gray-200 ring-gray-200', label: 'Viewer' },
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

export default function MembersTab({ workspaceId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workspaceApi.getWorkspaceMembers(workspaceId);
      setMembers(Array.isArray(data) ? data : data?.members || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (member, newRole) => {
    const prevRole = member.role;
    setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, role: newRole } : m)));
    try {
      await workspaceApi.updateMemberRole(workspaceId, member.user_id, { role: newRole });
    } catch (err) {
      setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, role: prevRole } : m)));
      toast.error(getErrorMessage(err, 'Failed to update role'));
    }
  };

  const handleRemove = async (member) => {
    setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    try {
      await workspaceApi.removeWorkspaceMember(workspaceId, member.user_id);
      toast.success('Member removed');
    } catch (err) {
      setMembers((prev) => [...prev, member]);
      toast.error(getErrorMessage(err, 'Failed to remove member'));
    }
  };

  const q = search.toLowerCase();
  const filtered = members.filter(
    (m) => (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q),
  );

  const ROLE_OPTIONS = ['WORKSPACE_ADMIN', 'MODERATOR', 'MEMBER', 'VIEWER'];

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-w-xs mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input className="input pl-10" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">{search ? 'No members match' : 'No members yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => {
            const gradIdx = hashCode(member.name || member.email || String(member.id)) % AVATAR_GRADIENTS.length;
            const roleStyle = ROLE_STYLES[member.role] || ROLE_STYLES.member;
            return (
              <div
                key={member.user_id || member.id}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-gray-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[gradIdx]} flex items-center justify-center shrink-0 shadow-sm`}>
                  <span className="text-sm font-bold text-white">{member.name?.[0]?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{member.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                </div>
                <select
                  value={member.role || 'MEMBER'}
                  onChange={(e) => handleRoleChange(member, e.target.value)}
                  className={`select text-xs max-w-[120px] ${roleStyle.bg} border-0 ring-1 ${roleStyle.bg.split(' ')[2] || 'ring-gray-200'}`}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{ROLE_STYLES[role]?.label || role}</option>
                  ))}
                </select>
                <button onClick={() => handleRemove(member)} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
