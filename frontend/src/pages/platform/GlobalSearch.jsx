import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiClock, FiStar, FiTrash2, FiBookmark, FiX, FiCheckSquare, FiFolder, FiFile, FiUser, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import platformApi from '../../services/platform/platformService';
import { useDebounce } from '../../hooks/useDebounce';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import SearchBar from '../../components/platform/search/SearchBar';
import SearchResults from '../../components/platform/search/SearchResults';
import SaveSearchModal from '../../components/platform/search/SaveSearchModal';

const RECENT_SEARCHES_KEY = 'platform_recent_searches';
const MAX_RECENT = 10;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch { return []; }
}

function addRecentSearch(query) {
  const recent = getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase());
  recent.unshift(query);
  if (recent.length > MAX_RECENT) recent.pop();
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

function removeRecentSearch(query) {
  const recent = getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase());
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

const ALL_MODULES = ['tasks', 'projects', 'teams', 'documents', 'users', 'meetings', 'approvals', 'knowledge_articles', 'messages'];

export default function PlatformGlobalSearch() {
  const [query, setQuery] = useState('');
  const [selectedModules, setSelectedModules] = useState([...ALL_MODULES]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches());
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  const loadSavedSearches = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res = await platformApi.search.savedSearches.list({ page: 1, size: 50 });
      setSavedSearches(res.data?.items || res.data?.data || []);
    } catch { /* silently fail */ }
    finally { setSavedLoading(false); }
  }, []);

  useEffect(() => { loadSavedSearches(); }, [loadSavedSearches]);

  const doSearch = useCallback(async (q, modules) => {
    if (!q || q.trim().length < 1) { setResults(null); setError(null); return; }
    setLoading(true);
    setError(null);
    try {
      const entityTypes = modules.length === ALL_MODULES.length ? undefined : modules.join(',');
      const res = await platformApi.search.global({ q: q.trim(), entity_types: entityTypes, page: 1, size: 50 });
      setResults(res.data);
      addRecentSearch(q.trim());
      setRecentSearches(getRecentSearches());
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Search failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) doSearch(debouncedQuery, selectedModules);
    else { setResults(null); setError(null); }
  }, [debouncedQuery, selectedModules, doSearch]);

  const handleQueryChange = (val) => setQuery(val);

  const handleModuleToggle = (moduleKey) => {
    if (moduleKey === '') {
      setSelectedModules(selectedModules.length === ALL_MODULES.length ? [] : [...ALL_MODULES]);
      return;
    }
    setSelectedModules((prev) =>
      prev.includes(moduleKey) ? prev.filter((m) => m !== moduleKey) : [...prev, moduleKey]
    );
  };

  const handleClear = () => { setQuery(''); setResults(null); setError(null); };

  const handleRecentClick = (q) => setQuery(q);

  const handleSaveSearch = async (data) => {
    await platformApi.search.savedSearches.create(data);
    loadSavedSearches();
  };

  const handleDeleteSaved = async (id) => {
    try {
      await platformApi.search.savedSearches.delete(id);
      loadSavedSearches();
    } catch { /* silently fail */ }
  };

  const handleSavedClick = (saved) => {
    if (saved.query?.q) setQuery(saved.query.q);
    if (saved.query?.entity_types) setSelectedModules(saved.query.entity_types);
  };

  const hasFilters = selectedModules.length < ALL_MODULES.length;

  return (
    <PlatformPageLayout
      title="Global Search"
      subtitle="Enterprise-wide search across all modules and content"
      icon={FiSearch}
    >
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Recent Searches */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiClock className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent</h3>
              </div>
              {recentSearches.length > 0 && (
                <button onClick={() => { clearRecentSearches(); setRecentSearches([]); }} className="text-[10px] text-gray-400 hover:text-red-500 font-medium">
                  Clear
                </button>
              )}
            </div>
            {recentSearches.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No recent searches</p>
            ) : (
              <div className="space-y-0.5">
                {recentSearches.map((s) => (
                  <div key={s} className="group flex items-center justify-between">
                    <button onClick={() => handleRecentClick(s)} className="flex items-center gap-2 py-1.5 text-xs text-gray-600 hover:text-indigo-600 transition-colors truncate flex-1 text-left">
                      <FiClock className="w-3 h-3 text-gray-300 shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                    <button onClick={() => { removeRecentSearch(s); setRecentSearches(getRecentSearches()); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all">
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Searches */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiStar className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved</h3>
              </div>
              {query && (
                <button onClick={() => setShowSaveModal(true)} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium">
                  + Save
                </button>
              )}
            </div>

            {savedLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : savedSearches.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No saved searches</p>
            ) : (
              <div className="space-y-0.5">
                {savedSearches.map((s) => (
                  <div key={s.id} className="group flex items-center justify-between">
                    <button onClick={() => handleSavedClick(s)} className="flex items-center gap-2 py-1.5 text-xs text-gray-600 hover:text-amber-600 transition-colors truncate flex-1 text-left">
                      <FiBookmark className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </button>
                    <button onClick={() => handleDeleteSaved(s.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all">
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            selectedModules={selectedModules}
            onModuleToggle={handleModuleToggle}
            onClear={handleClear}
          />

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          {!query && !loading && !results && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-5 shadow-sm">
                <FiSearch className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Enterprise Search</h3>
              <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                Search across all enterprise modules. Use the filter chips above to narrow your search to specific modules. Recent and saved searches are shown in the sidebar.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Tasks', icon: FiCheckSquare, color: 'text-emerald-500' },
                  { label: 'Projects', icon: FiFolder, color: 'text-blue-500' },
                  { label: 'Documents', icon: FiFile, color: 'text-amber-500' },
                  { label: 'Users', icon: FiUser, color: 'text-cyan-500' },
                  { label: 'Meetings', icon: FiCalendar, color: 'text-rose-500' },
                  { label: 'Messages', icon: FiMessageSquare, color: 'text-pink-500' },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <Icon className={`w-5 h-5 ${m.color}`} />
                      <span className="text-[10px] font-medium text-gray-500">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <SearchResults
            groups={results?.groups}
            loading={loading}
            query={query}
            hasFilters={hasFilters}
            total={results?.total}
          />
        </div>
      </div>

      <SaveSearchModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        query={query}
        selectedModules={selectedModules}
        onSave={handleSaveSearch}
      />
    </PlatformPageLayout>
  );
}
