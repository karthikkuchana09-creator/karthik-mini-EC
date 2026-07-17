import { FiSearch, FiX } from 'react-icons/fi';

const MODULES = [
  { key: 'tasks', label: 'Tasks', color: 'from-emerald-500 to-teal-500' },
  { key: 'projects', label: 'Projects', color: 'from-blue-500 to-indigo-500' },
  { key: 'teams', label: 'Teams', color: 'from-purple-500 to-pink-500' },
  { key: 'documents', label: 'Documents', color: 'from-amber-500 to-orange-500' },
  { key: 'users', label: 'Users', color: 'from-cyan-500 to-sky-500' },
  { key: 'meetings', label: 'Meetings', color: 'from-rose-500 to-red-500' },
  { key: 'approvals', label: 'Approvals', color: 'from-orange-500 to-red-500' },
  { key: 'knowledge_articles', label: 'Knowledge Base', color: 'from-indigo-500 to-violet-500' },
  { key: 'messages', label: 'Messages', color: 'from-pink-500 to-rose-500' },
];

export default function SearchFilters({ query, onQueryChange, selectedModules, onModuleToggle, onClear, className = '' }) {
  const hasFilters = query || selectedModules.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search across all enterprise modules..."
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-white"
          autoFocus
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MODULES.map((mod) => {
          const active = selectedModules.includes(mod.key);
          return (
            <button
              key={mod.key}
              onClick={() => onModuleToggle(mod.key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${mod.color}`} />
              {mod.label}
            </button>
          );
        })}
      </div>

      {hasFilters && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FiX className="w-3 h-3" />
          Clear all filters
        </button>
      )}
    </div>
  );
}
