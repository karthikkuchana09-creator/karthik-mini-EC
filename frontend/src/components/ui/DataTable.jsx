import { useMemo, useState } from 'react';
import { SkeletonTableRows } from './Skeleton';
import EmptyState from './EmptyState';

function SortIcon({ direction }) {
  if (!direction) return <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
  return (
    <svg className={`w-3.5 h-3.5 ${direction === 'asc' ? 'text-indigo-600' : 'text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      {direction === 'asc'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
    </svg>
  );
}

function DataTable({
  columns,
  data,
  loading = false,
  sortable = true,
  onRowClick,
  emptyTitle = 'No data found',
  emptyDescription = 'No records to display.',
  keyExtractor = (row) => row.id,
  page,
  totalPages,
  onPageChange,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) {
    return <SkeletonTableRows rows={5} cols={columns.length} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={`px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                  col.sortable !== false && sortable ? 'cursor-pointer hover:bg-gray-100/80 select-none' : ''
                } ${col.className || ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {col.sortable !== false && sortable && <SortIcon direction={sortConfig.key === col.key ? sortConfig.direction : null} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {sortedData.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? 'cursor-pointer' : ''} ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
              } hover:bg-indigo-50/40 transition-colors`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-6 py-4 text-sm text-gray-700 whitespace-nowrap ${col.cellClassName || ''}`}>
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(page !== undefined && totalPages !== undefined && totalPages > 1) && (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
