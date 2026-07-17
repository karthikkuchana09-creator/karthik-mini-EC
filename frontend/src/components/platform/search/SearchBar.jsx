import { FiSearch, FiX } from 'react-icons/fi';

const MODULES = [
  { key: '', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' },
  { key: 'tasks', label: 'Tasks', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
  { key: 'projects', label: 'Projects', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { key: 'teams', label: 'Teams', color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
  { key: 'documents', label: 'Documents', color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
  { key: 'users', label: 'Users', color: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200' },
  { key: 'meetings', label: 'Meetings', color: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200' },
  { key: 'approvals', label: 'Approvals', color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
  { key: 'knowledge_articles', label: 'Knowledge', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200' },
  { key: 'messages', label: 'Messages', color: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200' },
];

export default function SearchBar({ query, onQueryChange, selectedModules, onModuleToggle, onClear }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search across tasks, projects, documents, meetings, approvals, users, teams, messages, knowledge articles..."
          className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200/70 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-sm transition-all duration-200"
          autoFocus
        />
        {query && (
          <button onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {MODULES.map((mod) => {
          const isSelected = mod.key === '' || selectedModules.includes(mod.key);
          const isAll = mod.key === '';
          return (
            <button
              key={mod.key}
              onClick={() => onModuleToggle(mod.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                isSelected
                  ? mod.color
                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
              } ${!isSelected ? 'opacity-50' : ''}`}
            >
              {mod.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
