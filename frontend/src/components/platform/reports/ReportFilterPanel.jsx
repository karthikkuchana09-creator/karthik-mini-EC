import { FiBarChart2, FiCheckSquare, FiCheckCircle, FiFile, FiFilter, FiX } from 'react-icons/fi';

const REPORT_TYPES = [
  { key: 'projects', label: 'Project Report', icon: FiBarChart2, color: 'from-indigo-500 to-blue-500' },
  { key: 'tasks', label: 'Task Report', icon: FiCheckSquare, color: 'from-amber-500 to-orange-500' },
  { key: 'approvals', label: 'Approval Report', icon: FiCheckCircle, color: 'from-rose-500 to-red-500' },
  { key: 'documents', label: 'Document Report', icon: FiFile, color: 'from-purple-500 to-pink-500' },
];

export default function ReportFilterPanel({
  reportType,
  onReportTypeChange,
  filters,
  onFilterChange,
  onGenerate,
  onReset,
  loading,
  workspaces = [],
  className = '',
}) {
  const showWorkspace = reportType !== 'documents';

  const statusOptions = reportType === 'projects'
    ? ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
    : reportType === 'tasks'
    ? ['todo', 'in_progress', 'review', 'done']
    : reportType === 'approvals'
    ? ['pending', 'approved', 'rejected', 'on_hold']
    : [];

  const hasActiveFilters = filters.workspace_id || filters.status || filters.priority || filters.start_date || filters.end_date;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <FiFilter className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Report Filters</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            const active = reportType === rt.key;
            return (
              <button
                key={rt.key}
                onClick={() => onReportTypeChange(rt.key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${rt.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                {rt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showWorkspace && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Workspace</label>
              <select
                value={filters.workspace_id || ''}
                onChange={(e) => onFilterChange('workspace_id', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                disabled={loading}
              >
                <option value="">All Workspaces</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {statusOptions.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => onFilterChange('status', e.target.value || undefined)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                disabled={loading}
              >
                <option value="">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => onFilterChange('start_date', e.target.value || undefined)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => onFilterChange('end_date', e.target.value || undefined)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md"
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Generate Report
          </button>
          <button
            onClick={onReset}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => { onFilterChange('workspace_id', undefined); onFilterChange('status', undefined); onFilterChange('priority', undefined); onFilterChange('start_date', undefined); onFilterChange('end_date', undefined); }}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FiX className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
