import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../api/workspaces';
import * as channelApi from '../../api/channels';
import { getErrorMessage } from '../../utils/errorHandler';

const BANNER_COLORS = [
  'from-indigo-500 to-indigo-600', 'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600', 'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600', 'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-600', 'from-orange-500 to-orange-600',
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

export default function WorkspaceChannels() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceId = Number(id);

  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, chs] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        channelApi.getWorkspaceChannels(workspaceId),
      ]);
      setWorkspace(ws);
      setChannels(Array.isArray(chs) ? chs : chs?.channels || []);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Workspace not found');
        navigate('/workspaces');
      } else {
        setError(getErrorMessage(err, 'Failed to load channels'));
        toast.error(getErrorMessage(err, 'Failed to load channels'));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = channels.filter((ch) => {
    const q = search.toLowerCase();
    if (q && !ch.name?.toLowerCase().includes(q) && !ch.description?.toLowerCase().includes(q)) return false;
    return true;
  });

  const bannerColor = workspace ? BANNER_COLORS[hashCode(workspace.name || workspace.id) % BANNER_COLORS.length] : 0;

  const NAV_TABS = [
    { label: 'Overview', path: `/workspaces/${workspaceId}` },
    { label: 'Messages', path: `/workspaces/${workspaceId}/messages` },
    { label: 'Tasks', path: `/workspaces/${workspaceId}/tasks` },
    { label: 'Documents', path: `/workspaces/${workspaceId}/documents` },
    { label: 'Members', path: `/workspaces/${workspaceId}/members` },
    { label: 'Channels', path: `/workspaces/${workspaceId}/channels` },
  ];

  const TYPE_CONFIG = {
    Public: { bg: 'bg-blue-50 text-blue-700' },
    Private: { bg: 'bg-amber-50 text-amber-700' },
    Announcement: { bg: 'bg-purple-50 text-purple-700' },
    Project: { bg: 'bg-orange-50 text-orange-700' },
  };

  if (error && !loading) {
    return (
      <div className="page-container max-w-4xl">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-3 rounded-full bg-red-50 mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">Failed to load</p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button onClick={fetchData} className="btn-secondary text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      <button onClick={() => navigate(`/workspaces/${workspaceId}`)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to {workspace?.name || 'Workspace'}
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className={`h-24 bg-gradient-to-br ${bannerColor} p-5 flex items-end`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 ring-2 ring-white/40 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{workspace?.name?.[0]?.toUpperCase() || 'W'}</span>
            </div>
            <div className="pb-0.5">
              <h1 className="text-lg font-bold text-white drop-shadow-sm">{workspace?.name || 'Workspace'} Channels</h1>
              <p className="text-xs text-white/80">{channels.length} channel{channels.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-6 pt-3 pb-0">
          <nav className="flex gap-6 -mb-px">
            {NAV_TABS.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link key={tab.path} to={tab.path} className={`pb-3 text-xs font-medium border-b-2 transition-colors ${isActive ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-5">
          <div className="relative max-w-sm mb-5">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input className="input pl-10" placeholder="Search channels..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm font-medium text-gray-700">{search ? 'No channels match your search' : 'No channels yet'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((ch) => {
                const typeCfg = TYPE_CONFIG[ch.type] || TYPE_CONFIG.Public;
                return (
                  <Link key={ch.id} to={`/channels/${ch.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeCfg.bg}`}>
                      <span className="text-sm font-bold">#</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{ch.name}</p>
                      {ch.description && <p className="text-xs text-gray-400 truncate mt-0.5">{ch.description}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeCfg.bg}`}>{ch.type}</span>
                    {ch.member_count !== undefined && (
                      <span className="text-xs text-gray-400">{ch.member_count} members</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
