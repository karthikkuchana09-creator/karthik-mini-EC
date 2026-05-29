import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiUser, FiX, FiSearch, FiAlertCircle } from 'react-icons/fi';

export default function UserSelectDropdown({
  users = [],
  value,
  onChange,
  placeholder = 'Select user...',
  loading = false,
  error,
  searchable = true,
  disabled = false,
  name,
}) {
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

  const selectedUser = users.find((u) => u.id === value);

  const filteredUsers = searchable && search
    ? users.filter((u) =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
          error ? 'border-red-300 bg-red-50' : disabled ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={name || placeholder}
      >
        {selectedUser ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {selectedUser.name?.charAt(0)?.toUpperCase() || <FiUser className="w-3 h-3" />}
            </span>
            <span className="truncate">{selectedUser.name}</span>
          </span>
        ) : (
          <span className="text-gray-400 flex items-center gap-2">
            <FiUser className="w-4 h-4" />
            {placeholder}
          </span>
        )}
        <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
          aria-label={name || 'Select user'}
        >
          {searchable && (
            <div className="relative border-b border-gray-100">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2.5 text-sm focus:outline-none"
                autoFocus
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => { onChange(user.id); setIsOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left ${
                    value === user.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                  }`}
                  role="option"
                  aria-selected={value === user.id}
                >
                  <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0">
                    {user.name?.charAt(0)?.toUpperCase() || <FiUser className="w-3 h-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{user.name}</p>
                    {user.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
                  </div>
                  {value === user.id && <FiX className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1" role="alert">
          <FiAlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
