import { useMemo, useState, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import {
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiSearch,
} from 'react-icons/fi';
import { BTN_GHOST } from '../../config/ui';

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return (
    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${direction === 'asc' ? 'text-indigo-600' : 'text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      {direction === 'asc'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
    </svg>
  );
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function Pagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, pageSizeOptions, totalItems }) {
  const maxVisible = 5;

  const windowedPages = useMemo(() => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    const adjustedStart = Math.max(1, end - maxVisible + 1);

    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  }, [currentPage, totalPages]);

  if (totalPages <= 1 && !onPageSizeChange) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="hidden sm:inline">
          Showing <span className="font-medium text-gray-700">{startItem}</span> to <span className="font-medium text-gray-700">{endItem}</span> of <span className="font-medium text-gray-700">{totalItems}</span>
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className={BTN_GHOST + ' btn-icon-sm'}
          aria-label="First page"
        >
          <FiChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={BTN_GHOST + ' btn-icon-sm'}
          aria-label="Previous page"
        >
          <FiChevronLeft className="w-3.5 h-3.5" />
        </button>

        {windowedPages.map((page, idx) => {
          const showEllipsisLeft = idx === 0 && page > 1;
          const showEllipsisRight = idx === windowedPages.length - 1 && page < totalPages;
          return (
            <span key={page} className="flex items-center">
              {showEllipsisLeft && <span className="px-1 text-xs text-gray-400">...</span>}
              <button
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 text-xs font-medium rounded-lg transition-all duration-150 ${
                  page === currentPage
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
              {showEllipsisRight && <span className="px-1 text-xs text-gray-400">...</span>}
            </span>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={BTN_GHOST + ' btn-icon-sm'}
          aria-label="Next page"
        >
          <FiChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className={BTN_GHOST + ' btn-icon-sm'}
          aria-label="Last page"
        >
          <FiChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  error,
  sortable = true,
  searchable = false,
  paginated = false,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  showPageSize = false,
  onRowClick,
  emptyMessage = 'No data found',
  emptyTitle = 'No data',
  emptyIcon,
  className = '',
  rowKey = 'id',
  stickyHeader = false,
  onSort,
  externalSort,
}) {
  const [internalSort, setInternalSort] = useState({ key: null, direction: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  const sort = externalSort || internalSort;
  const setSort = onSort || setInternalSort;
  const activePageSize = showPageSize ? internalPageSize : pageSize;

  const isControlled = currentPage !== undefined;

  const filteredData = useMemo(() => {
    if (!searchQuery || !searchable) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = getNestedValue(row, col.accessor);
        return val != null && String(val).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, searchable, columns]);

  const sortedData = useMemo(() => {
    if (!sort.key || !sort.direction) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = getNestedValue(a, sort.key);
      const bVal = getNestedValue(b, sort.key);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / activePageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageData = useMemo(() => {
    if (!paginated) return sortedData;
    const start = (safePage - 1) * activePageSize;
    return sortedData.slice(start, start + activePageSize);
  }, [sortedData, paginated, safePage, activePageSize]);

  function handleSort(key) {
    if (!sortable) return;
    const newDirection = sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ key, direction: newDirection });
  }

  function handlePageChange(page) {
    setCurrentPage(page);
  }

  function handlePageSizeChange(newSize) {
    setInternalPageSize(newSize);
    setCurrentPage(1);
  }

  const showEmptyState = !loading && !error && (!data || data.length === 0);
  const showFilteredEmptyState = !loading && !error && data.length > 0 && sortedData.length === 0;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden ${className}`}>
      {searchable && (
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search..."
              className="input pl-9 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner fullPage text="Loading data..." />
      ) : error ? (
        <div className="p-5">
          <EmptyState icon={emptyIcon} title="Error loading data" message={error} size="sm" />
        </div>
      ) : showEmptyState ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} size="sm" />
      ) : showFilteredEmptyState ? (
        <div className="p-5">
          <EmptyState icon={emptyIcon} title="No results" message="Try adjusting your search or filters" size="sm" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.accessor}
                      onClick={() => col.disableSortBy !== true && sortable && handleSort(col.accessor)}
                      className={`px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                        col.disableSortBy !== true && sortable ? 'cursor-pointer select-none group' : ''
                      } ${col.className || ''}`}
                      style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.Header}</span>
                        {col.disableSortBy !== true && sortable && (
                          <SortIcon direction={sort.key === col.accessor ? sort.direction : null} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageData.map((row, idx) => (
                  <tr
                    key={row[rowKey] ?? idx}
                    onClick={() => onRowClick?.(row)}
                    className={`
                      transition-colors duration-150
                      ${onRowClick ? 'cursor-pointer' : ''}
                      hover:bg-indigo-50/40
                      ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}
                    `}
                  >
                    {columns.map((col) => {
                      const value = getNestedValue(row, col.accessor);
                      return (
                        <td
                          key={col.accessor}
                          className={`px-5 py-4 text-sm text-gray-700 whitespace-nowrap ${col.cellClassName || ''}`}
                        >
                          {col.Cell ? <col.Cell value={value} row={{ original: row, ...row }} /> : (value ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginated && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={activePageSize}
              onPageSizeChange={showPageSize ? handlePageSizeChange : undefined}
              pageSizeOptions={pageSizeOptions}
              totalItems={sortedData.length}
            />
          )}
        </>
      )}
    </div>
  );
}
