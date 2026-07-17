import { FiSearch, FiFile, FiUsers, FiCheckSquare, FiMessageSquare, FiBookOpen, FiFolder, FiUser, FiCalendar, FiCheckCircle } from 'react-icons/fi';

const MODULE_ICONS = {
  tasks: { icon: FiCheckSquare, color: 'from-emerald-500 to-teal-500' },
  projects: { icon: FiFolder, color: 'from-blue-500 to-indigo-500' },
  teams: { icon: FiUsers, color: 'from-purple-500 to-pink-500' },
  documents: { icon: FiFile, color: 'from-amber-500 to-orange-500' },
  users: { icon: FiUser, color: 'from-cyan-500 to-sky-500' },
  meetings: { icon: FiCalendar, color: 'from-rose-500 to-red-500' },
  approvals: { icon: FiCheckCircle, color: 'from-orange-500 to-red-500' },
  knowledge_articles: { icon: FiBookOpen, color: 'from-indigo-500 to-violet-500' },
  messages: { icon: FiMessageSquare, color: 'from-pink-500 to-rose-500' },
};

const MODULE_LABELS = {
  tasks: 'Tasks', projects: 'Projects', teams: 'Teams', documents: 'Documents',
  users: 'Users', meetings: 'Meetings', approvals: 'Approvals',
  knowledge_articles: 'Knowledge Base', messages: 'Messages',
};

export function ResultCard({ item }) {
  const mod = MODULE_ICONS[item.entity_type] || { icon: FiFile, color: 'from-gray-500 to-gray-600' };
  const Icon = mod.icon;

  return (
    <a
      href={item.url}
      className="block bg-white rounded-xl border border-gray-200/70 shadow-sm p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-sm shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200`}>
              {MODULE_LABELS[item.entity_type] || item.entity_type}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
            {item.title}
          </h4>
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}
          <p className="text-[10px] text-gray-400 mt-1.5 font-mono">ID: #{item.id}</p>
        </div>
      </div>
    </a>
  );
}

export function ResultGroup({ group }) {
  const mod = MODULE_ICONS[group.entity_type] || { icon: FiFile, color: 'from-gray-500 to-gray-600' };
  const Icon = mod.icon;
  const IconBg = mod.color;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${IconBg} flex items-center justify-center shadow-sm`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          {MODULE_LABELS[group.entity_type] || group.entity_type}
        </h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
          {group.count}
        </span>
      </div>
      <div className="space-y-2">
        {group.results.map((item) => (
          <ResultCard key={`${item.entity_type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export function SearchLoading() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((g) => (
        <div key={g} className="space-y-3">
          <div className="flex items-center gap-2.5 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-100 rounded w-8" />
          </div>
          {[1, 2].map((r) => (
            <div key={r} className="bg-white rounded-xl border border-gray-200/70 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SearchEmpty({ query, hasFilters }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
        <FiSearch className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {query ? 'No results found' : 'Start your search'}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-md">
        {query
          ? `No results matching "${query}"${hasFilters ? ' with the current filters' : ''}. Try different keywords or adjust your filters.`
          : 'Type a query above to search across all enterprise modules. Use filters to narrow results by module.'}
      </p>
    </div>
  );
}

export default function SearchResults({ groups, loading, query, hasFilters, total }) {
  if (loading) return <SearchLoading />;

  if (!groups || groups.length === 0) return <SearchEmpty query={query} hasFilters={hasFilters} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          Found <span className="font-semibold text-gray-900">{total}</span> result{total !== 1 ? 's' : ''}
          {query && <> for "<span className="font-medium text-gray-700">{query}</span>"</>}
        </p>
      </div>
      <div className="space-y-6">
        {groups.map((group) => (
          <ResultGroup key={group.entity_type} group={group} />
        ))}
      </div>
    </div>
  );
}
