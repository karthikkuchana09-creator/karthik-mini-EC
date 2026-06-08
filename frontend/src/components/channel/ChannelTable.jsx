import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTimestamp } from '../../utils/format';

const SORT_ICONS = {
  asc: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ),
  desc: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

const TYPE_BADGES = {
  Public: 'bg-blue-50 text-blue-700',
  Private: 'bg-amber-50 text-amber-700',
  Announcement: 'bg-purple-50 text-purple-700',
  Project: 'bg-orange-50 text-orange-700',
};

const STATUS_BADGES = {
  active: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

export default function ChannelTable({ channels, onArchive, onRestore, onJoin, onLeave }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    if (!channels) return [];
    return [...channels].sort((a, b) => {
      let aVal = a[sortKey], bVal = b[sortKey];
      if (sortKey === 'created_at' || sortKey === 'member_count') {
        aVal = Number(aVal); bVal = Number(bVal);
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [channels, sortKey, sortDir]);

  const SortHeader = ({ label, sortKey: k }) => (
    <th
      className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors"
      onClick={() => handleSort(k)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === k && SORT_ICONS[sortDir]}
      </div>
    </th>
  );

  if (!channels || channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No channels found</p>
        <p className="text-xs text-gray-400 mt-1">Create a channel to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <SortHeader label="Channel" sortKey="name" />
            <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
            <SortHeader label="Type" sortKey="type" />
            <SortHeader label="Members" sortKey="member_count" />
            <SortHeader label="Status" sortKey="status" />
            <SortHeader label="Created" sortKey="created_at" />
            <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((ch) => {
            const isArchived = ch.status === 'archived';
            return (
              <tr
                key={ch.id}
                className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
                onClick={() => navigate(`/channels/${ch.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">#</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{ch.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">
                  {ch.description || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_BADGES[ch.type] || TYPE_BADGES.Public}`}>
                    {ch.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                  {ch.member_count ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_BADGES[ch.status] || STATUS_BADGES.active}`}>
                    {ch.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                  {formatTimestamp(ch.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {ch._is_member !== undefined && onJoin && onLeave && (
                      ch._is_member ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onLeave(ch); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Leave channel"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); onJoin(ch); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                          title="Join channel"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                          </svg>
                        </button>
                      )
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/channels/${ch.id}`); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      title="View details"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {isArchived ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRestore?.(ch); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Restore channel"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onArchive?.(ch); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Archive channel"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
