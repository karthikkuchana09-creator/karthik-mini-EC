import { FiFilter, FiX } from 'react-icons/fi';

const filterInputClass = 'px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

export default function FilterBar({
  filters = [],
  values = {},
  onChange,
  onClear,
  className = '',
  loading = false,
}) {
  const hasActiveFilters = Object.values(values).some((v) => v !== '' && v != null);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="search" aria-label="Filters">
      {filters.length === 0 ? (
        <span className="text-sm text-gray-400">No filters available</span>
      ) : (
        filters.map((filter) => (
          <div key={filter.key} className="flex items-center gap-1.5">
            {filter.label && (
              <label htmlFor={`filter-${filter.key}`} className="text-sm font-medium text-gray-600 whitespace-nowrap">
                {filter.label}
              </label>
            )}
            {filter.type === 'select' ? (
              <select
                id={`filter-${filter.key}`}
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                disabled={loading}
                className={`${filterInputClass} min-w-[120px] appearance-none`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 12 12'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m3 5 3 3 3-3'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  paddingRight: '2rem',
                }}
              >
                <option value="">All</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                id={`filter-${filter.key}`}
                type="date"
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                disabled={loading}
                className={`${filterInputClass} min-w-[140px]`}
              />
            ) : (
              <input
                id={`filter-${filter.key}`}
                type="text"
                placeholder={filter.placeholder || `Search ${filter.label}`}
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                disabled={loading}
                className={`${filterInputClass} w-44`}
              />
            )}
          </div>
        ))
      )}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Clear all filters"
        >
          <FiX className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
      {!hasActiveFilters && filters.length > 0 && (
        <FiFilter className="w-4 h-4 text-gray-400" aria-hidden="true" />
      )}
    </div>
  );
}
