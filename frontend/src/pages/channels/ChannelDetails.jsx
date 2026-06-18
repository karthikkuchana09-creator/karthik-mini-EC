import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as channelApi from '../../api/channels';
import { getErrorMessage } from '../../utils/errorHandler';
import Breadcrumb from '../../components/ui/Breadcrumb';

const MessagesTab = lazy(() => import('../../components/channel/tabs/MessagesTab'));
const TasksTab = lazy(() => import('../../components/channel/tabs/TasksTab'));
const DocumentsTab = lazy(() => import('../../components/channel/tabs/DocumentsTab'));

const BANNER_GRADIENTS = [
  'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
  'from-purple-500 to-violet-600', 'from-orange-500 to-rose-600',
  'from-cyan-500 to-blue-600', 'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600', 'from-teal-500 to-cyan-600',
];

const TYPE_CONFIG = {
  Public: { bg: 'bg-emerald-400/20 text-emerald-100', dot: 'bg-emerald-300' },
  Private: { bg: 'bg-amber-400/20 text-amber-100', dot: 'bg-amber-300' },
  Announcement: { bg: 'bg-purple-400/20 text-purple-100', dot: 'bg-purple-300' },
  Project: { bg: 'bg-orange-400/20 text-orange-100', dot: 'bg-orange-300' },
};

const TABS = [
  { key: 'messages', label: 'Messages', icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155' },
  { key: 'tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { key: 'documents', label: 'Documents', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

function TabFallback() {
  return (
    <div className="space-y-4 py-8">
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  );
}

export default function ChannelDetails() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const cId = Number(channelId);

  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');

  const fetchChannel = useCallback(async () => {
    setLoading(true);
    try {
      const data = await channelApi.getChannel(cId);
      setChannel(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Channel not found');
        navigate('/channels');
      } else {
        setError(getErrorMessage(err, 'Failed to load channel'));
        toast.error(getErrorMessage(err, 'Failed to load channel'));
      }
    } finally {
      setLoading(false);
    }
  }, [cId, navigate]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

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
          <button onClick={fetchChannel} className="btn-secondary text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  if (!channel) return null;

  const isArchived = channel.status === 'archived';
  const bannerGrad = BANNER_GRADIENTS[hashCode(channel.name || channel.id) % BANNER_GRADIENTS.length];
  const typeCfg = TYPE_CONFIG[channel.type] || TYPE_CONFIG.Public;

  const tabComponents = {
    messages: MessagesTab,
    tasks: TasksTab,
    documents: DocumentsTab,
  };

  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: 'Channels', to: '/channels' },
          { label: channel.name },
        ]}
      />

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className={`relative bg-gradient-to-br ${bannerGrad} px-6 sm:px-8 pt-8 sm:pt-10 pb-20 sm:pb-24`}>
          {isArchived && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold text-white/90 backdrop-blur-sm">
              Archived
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 ring-4 ring-white/40 flex items-center justify-center shadow-xl">
              <span className="text-3xl sm:text-4xl font-bold text-white">#</span>
            </div>

            <div className="pb-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm truncate">
                {channel.name}
              </h1>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold ${typeCfg.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${typeCfg.dot}`} />
                  {channel.type}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                  isArchived ? 'bg-gray-400/20 text-gray-200' : 'bg-emerald-400/20 text-emerald-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-gray-300' : 'bg-emerald-300'}`} />
                  {channel.status || 'active'}
                </span>
                {channel.workspace_name && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                    </svg>
                    {channel.workspace_name}
                  </span>
                )}
                {channel.member_count !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {channel.member_count}
                  </span>
                )}
              </div>
              {channel.description && (
                <p className="text-sm text-white/70 mt-2 max-w-2xl line-clamp-2">{channel.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8">
          <nav className="flex gap-1 -mt-4 sm:-mt-5 overflow-x-auto pb-0 scrollbar-none" aria-label="Tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/70 border-b-white -mb-px z-10'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 border border-transparent'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-200/70 p-6 sm:p-8">
          <Suspense fallback={<TabFallback />}>
            <ActiveComponent key={activeTab} channelId={cId} channel={channel} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
