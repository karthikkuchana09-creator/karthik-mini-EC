import { useState } from 'react';
import RoleSelector from './RoleSelector';
import { formatTimestamp } from '../../utils/format';

export default function MembersTable({ members, onRoleChange, onRemove, loading = false }) {
  const [confirmRemove, setConfirmRemove] = useState(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No members yet</p>
        <p className="text-xs text-gray-400 mt-1">Add members to this workspace to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {members.map((member) => {
        const isRemoving = confirmRemove === member.user_id;
        return (
          <div key={member.user_id} className="flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors rounded-lg">
            <div className="relative shrink-0">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name || member.email} className="w-9 h-9 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center ring-2 ring-white text-xs font-bold text-white">
                  {(member.name || member.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                member.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {member.name || 'Unnamed User'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {member.email}
                {member.joined_at && (
                  <span className="ml-2">&middot; Joined {formatTimestamp(member.joined_at)}</span>
                )}
              </p>
            </div>

            <div className="shrink-0">
              <RoleSelector
                value={member.role}
                onChange={(newRole) => onRoleChange(member, newRole)}
                disabled={isRemoving}
              />
            </div>

            {isRemoving ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onRemove(member)}
                  className="px-2 py-1 text-[10px] font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="px-2 py-1 text-[10px] font-medium text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRemove(member.user_id)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                title="Remove member"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
