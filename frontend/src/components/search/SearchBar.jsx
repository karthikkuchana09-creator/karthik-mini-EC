import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../api/search';
import { FiSearch, FiFileText, FiFolder, FiUsers, FiCheckSquare, FiFile, FiHash, FiVideo, FiBookOpen, FiX } from 'react-icons/fi';

const entityIcons = {
  tasks: FiCheckSquare, projects: FiFolder, teams: FiUsers, documents: FiFile,
  channels: FiHash, meetings: FiVideo, knowledge_articles: FiBookOpen, custom_forms: FiFileText, users: FiUsers,
};

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try { const data = await globalSearch({ q: value, size: 5 }); setResults(data); setOpen(true); }
      catch { setResults(null); }
      setLoading(false);
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { setOpen(false); navigate(`/search?q=${encodeURIComponent(query)}`); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={query} onChange={e => handleChange(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => results && setOpen(true)} placeholder="Search..." className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-gray-50/80" />
        {query && <button onClick={() => { setQuery(''); setResults(null); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FiX className="w-4 h-4" /></button>}
      </div>

      {open && results && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {results.groups?.length > 0 ? (
            <>
              <div className="p-2 max-h-80 overflow-y-auto">
                {results.groups.map(group => group.results.slice(0, 3).map(item => {
                  const Icon = entityIcons[item.entity_type] || FiFileText;
                  return (
                    <button key={`${item.entity_type}-${item.id}`} onClick={() => { setOpen(false); navigate(item.url); }} className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-400 truncate">{item.entity_type.replace('_', ' ')}</p>
                      </div>
                    </button>
                  );
                }))}
              </div>
              <button onClick={() => { setOpen(false); navigate(`/search?q=${encodeURIComponent(query)}`); }} className="w-full p-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 transition-colors">
                See all {results.total} results
              </button>
            </>
          ) : (
            <div className="p-4 text-sm text-gray-500 text-center">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
