import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as channelApi from '../../../api/channels';
import { getErrorMessage } from '../../../utils/errorHandler';

const TYPE_CONFIG = {
  Public: { bg: 'from-blue-500 to-cyan-600', label: 'Public' },
  Private: { bg: 'from-amber-500 to-orange-600', label: 'Private' },
  Announcement: { bg: 'from-purple-500 to-pink-600', label: 'Announcement' },
  Project: { bg: 'from-teal-500 to-green-600', label: 'Project' },
};

const TYPE_BADGE = {
  Public: 'bg-blue-50 text-blue-700 border-blue-200',
  Private: 'bg-amber-50 text-amber-700 border-amber-200',
  Announcement: 'bg-purple-50 text-purple-700 border-purple-200',
  Project: 'bg-teal-50 text-teal-700 border-teal-200',
};

export default function ChannelsTab({ workspaceId }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await channelApi.getWorkspaceChannels(workspaceId);
      setChannels(Array.isArray(data) ? data : data?.channels || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load channels'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const filtered = channels.filter((ch) => {
    const q = search.toLowerCase();
    if (q && !ch.name?.toLowerCase().includes(q) && !ch.description?.toLowerCase().includes(q)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-w-xs mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input className="input pl-10" placeholder="Search channels..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">{search ? 'No channels match' : 'No channels yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ch) => {
            const typeCfg = TYPE_CONFIG[ch.type] || TYPE_CONFIG.Public;
            const badgeCfg = TYPE_BADGE[ch.type] || TYPE_BADGE.Public;
            return (
              <Link
                key={ch.id}
                to={`/channels/${ch.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${typeCfg.bg} flex items-center justify-center shrink-0 shadow-sm`}>
                  <span className="text-sm font-bold text-white">#</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                    {ch.name}
                  </p>
                  {ch.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{ch.description}</p>
                  )}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${badgeCfg}`}>
                  {ch.type}
                </span>
                {ch.member_count !== undefined && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {ch.member_count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
