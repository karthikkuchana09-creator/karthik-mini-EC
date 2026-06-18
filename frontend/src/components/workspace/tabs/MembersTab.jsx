import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../../api/workspaces';
import { getErrorMessage } from '../../../utils/errorHandler';

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

  const ROLE_OPTIONS = ['admin', 'manager', 'member', 'viewer'];

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
          <p className="text-sm font-medium text-gray-700">{search ? 'No members match' : 'No members yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => (
            <div key={member.user_id || member.id} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100/50">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-indigo-600">{member.name?.[0]?.toUpperCase() || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{member.name || 'Unknown'}</p>
                <p className="text-xs text-gray-400 truncate">{member.email}</p>
              </div>
              <select
                value={member.role || 'member'}
                onChange={(e) => handleRoleChange(member, e.target.value)}
                className="select text-xs max-w-[110px]"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                ))}
              </select>
              <button onClick={() => handleRemove(member)} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 shrink-0">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
