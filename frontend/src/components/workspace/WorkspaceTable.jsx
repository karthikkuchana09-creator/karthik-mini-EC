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

const VISIBILITY_BADGES = {
  Public: 'bg-emerald-50 text-emerald-700',
  Private: 'bg-amber-50 text-amber-700',
};

const STATUS_BADGES = {
  active: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

export default function WorkspaceTable({ workspaces, onArchive, onRestore }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!workspaces) return [];
    return [...workspaces].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (sortKey === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [workspaces, sortKey, sortDir]);

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

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No workspaces found</p>
        <p className="text-xs text-gray-400 mt-1">Create a workspace to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <SortHeader label="Workspace" sortKey="name" />
            <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
            <SortHeader label="Visibility" sortKey="visibility" />
            <SortHeader label="Status" sortKey="status" />
            <SortHeader label="Created" sortKey="created_at" />
            <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((ws) => {
            const isArchived = ws.status === 'archived';
            return (
              <tr
                key={ws.id}
                className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
                onClick={() => navigate(`/workspaces/${ws.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                      {ws.name?.[0]?.toUpperCase() || 'W'}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{ws.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                  {ws.description || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${VISIBILITY_BADGES[ws.visibility] || VISIBILITY_BADGES.Public}`}>
                    {ws.visibility}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_BADGES[ws.status] || STATUS_BADGES.active}`}>
                    {ws.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                  {formatTimestamp(ws.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${ws.id}`); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      title="View details"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${ws.id}/edit`); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      title="Edit workspace"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    {isArchived ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRestore?.(ws); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Restore workspace"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onArchive?.(ws); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Archive workspace"
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
