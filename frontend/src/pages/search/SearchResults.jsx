import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { globalSearch } from '../../api/search';
import { FiSearch, FiFileText, FiFolder, FiUsers, FiCheckSquare, FiFile, FiHash, FiVideo, FiBookOpen } from 'react-icons/fi';

const entityIcons = {
  tasks: FiCheckSquare, projects: FiFolder, teams: FiUsers, documents: FiFile,
  channels: FiHash, meetings: FiVideo, knowledge_articles: FiBookOpen, custom_forms: FiFileText, users: FiUsers,
};

const entityLabels = {
  tasks: 'Tasks', projects: 'Projects', teams: 'Teams', documents: 'Documents',
  channels: 'Channels', meetings: 'Meetings', knowledge_articles: 'Knowledge Base', custom_forms: 'Custom Forms', users: 'Users',
};

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!query) { setResults(null); return; }
    setLoading(true);
    globalSearch({ q: query, size: 50 }).then(setResults).catch(() => setResults(null)).finally(() => setLoading(false));
  }, [query]);

  const allGroups = results?.groups || [];
  const filteredGroups = activeTab === 'all' ? allGroups : allGroups.filter(g => g.entity_type === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); setSearchParams({ q: fd.get('q') }); }}>
          <div className="relative max-w-2xl">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" name="q" defaultValue={query} placeholder="Search across all entities..." className="w-full pl-12 pr-4 py-3 text-base border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white shadow-sm" autoFocus />
          </div>
        </form>
      </div>

      {loading && <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" /></div>}

      {results && !loading && (
        <>
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{results.total}</span> results for "<span className="font-semibold text-gray-700">{results.query}</span>"
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All ({results.total})</button>
            {allGroups.map(g => {
              const Icon = entityIcons[g.entity_type] || FiFileText;
              return (
                <button key={g.entity_type} onClick={() => setActiveTab(g.entity_type)} className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${activeTab === g.entity_type ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Icon className="w-3.5 h-3.5" />{entityLabels[g.entity_type] || g.entity_type} ({g.count})
                </button>
              );
            })}
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No results found for this category</div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map(group => {
                const Icon = entityIcons[group.entity_type] || FiFileText;
                return (
                  <div key={group.entity_type}>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Icon className="w-4 h-4 text-indigo-500" />{entityLabels[group.entity_type] || group.entity_type}
                      <span className="text-xs font-normal text-gray-400">({group.count})</span>
                    </h3>
                    <div className="space-y-2">
                      {group.results.map(item => (
                        <Link key={`${item.entity_type}-${item.id}`} to={item.url} className="block bg-white rounded-xl border border-gray-200/70 shadow-sm p-4 hover:shadow-md hover:border-indigo-200 transition-all">
                          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!query && !loading && (
        <div className="text-center py-16 text-gray-400">
          <FiSearch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-semibold">Search across everything</p>
          <p className="text-sm mt-1">Tasks, projects, teams, documents, knowledge base, and more</p>
        </div>
      )}
    </div>
  );
}
