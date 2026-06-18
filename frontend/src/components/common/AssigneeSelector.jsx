import { useState, useRef, useEffect } from 'react';

const ROLE_STYLES = {
  WORKSPACE_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  MODERATOR: 'bg-blue-50 text-blue-700 border-blue-200',
  MEMBER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VIEWER: 'bg-gray-50 text-gray-600 border-gray-200',
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  MANAGER: 'bg-blue-50 text-blue-700 border-blue-200',
  EMPLOYEE: 'bg-green-50 text-green-700 border-green-200',
};

function getRoleStyle(role) {
  return ROLE_STYLES[role?.toUpperCase()] || 'bg-gray-50 text-gray-600 border-gray-200';
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function MemberAvatar({ member, size = 'md' }) {
  const sizeClasses = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' };
  const cls = `${sizeClasses[size] || sizeClasses.md} rounded-full shrink-0`;

  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.name || 'Member'}
        className={`${cls} object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div className={`${cls} bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center ring-2 ring-white`}>
      {getInitials(member.name || member.email)}
    </div>
  );
}

export default function AssigneeSelector({ members = [], selectedMember, onChange, placeholder = 'Select assignee...', disabled = false, loading = false, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const activeMembers = members.filter((m) => m.is_active !== false);

  const selected = activeMembers.find((m) => {
    if (selectedMember && typeof selectedMember === 'object') return m.id === selectedMember.id;
    return m.id === selectedMember;
  });

  const filtered = search
    ? activeMembers.filter((m) => {
        const q = search.toLowerCase();
        return (m.name || '').toLowerCase().includes(q) ||
               (m.email || '').toLowerCase().includes(q) ||
               (m.role || '').toLowerCase().includes(q);
      })
    : activeMembers;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { if (!disabled) setIsOpen(!isOpen); }} disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
          error ? 'border-red-300 bg-red-50' : disabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300 shadow-sm'
        }`}
        aria-haspopup="listbox" aria-expanded={isOpen}
      >
        {selected ? (
          <span className="flex items-center gap-2.5 min-w-0">
            <MemberAvatar member={selected} size="sm" />
            <span className="truncate text-gray-900 font-medium">{selected.name}</span>
            {selected.role && (
              <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getRoleStyle(selected.role)}`}>
                {selected.role.replace('_', ' ')}
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            {placeholder}
          </span>
        )}
        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden" role="listbox">
          <div className="relative border-b border-gray-100">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..." className="w-full pl-10 pr-3 py-2.5 text-sm focus:outline-none" autoFocus />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">
                {search ? 'No members match your search' : 'No active members available'}
              </div>
            ) : (
              filtered.map((member) => {
                const isSelected = selected && (selected.id === member.id);
                return (
                  <button key={member.id} type="button"
                    onClick={() => { onChange(member); setIsOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-sm hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0 ${
                      isSelected ? 'bg-indigo-50/60' : 'text-gray-700'
                    }`}
                    role="option" aria-selected={isSelected}
                  >
                    <MemberAvatar member={member} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                          {member.name || member.email || `Member #${member.id}`}
                        </span>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {member.email && <span className="text-xs text-gray-400 truncate">{member.email}</span>}
                        {member.role && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getRoleStyle(member.role)}`}>
                            {member.role.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1" role="alert">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
