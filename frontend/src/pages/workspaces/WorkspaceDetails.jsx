import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as workspaceApi from '../../api/workspaces';
import { getErrorMessage } from '../../utils/errorHandler';
import Breadcrumb from '../../components/ui/Breadcrumb';

const OverviewTab = lazy(() => import('../../components/workspace/tabs/OverviewTab'));
const MessagesTab = lazy(() => import('../../components/workspace/tabs/MessagesTab'));
const TasksTab = lazy(() => import('../../components/workspace/tabs/TasksTab'));
const DocumentsTab = lazy(() => import('../../components/workspace/tabs/DocumentsTab'));
const MembersTab = lazy(() => import('../../components/workspace/tabs/MembersTab'));
const ChannelsTab = lazy(() => import('../../components/workspace/tabs/ChannelsTab'));

const BANNER_GRADIENTS = [
  'from-indigo-600 to-indigo-800', 'from-blue-600 to-blue-800',
  'from-emerald-600 to-emerald-800', 'from-violet-600 to-violet-800',
  'from-rose-600 to-rose-800', 'from-amber-600 to-amber-800',
  'from-cyan-600 to-cyan-800', 'from-orange-600 to-orange-800',
];

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  { key: 'messages', label: 'Messages', icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155' },
  { key: 'tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { key: 'documents', label: 'Documents', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { key: 'members', label: 'Members', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
  { key: 'channels', label: 'Channels', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
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

export default function WorkspaceDetails() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const wId = Number(workspaceId);

  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workspaceApi.getWorkspace(wId);
      setWorkspace(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Workspace not found');
        navigate('/workspaces');
      } else {
        setError(getErrorMessage(err, 'Failed to load workspace'));
        toast.error(getErrorMessage(err, 'Failed to load workspace'));
      }
    } finally {
      setLoading(false);
    }
  }, [wId, navigate]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

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
          <button onClick={fetchWorkspace} className="btn-secondary text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  const isArchived = workspace.status === 'archived';
  const bannerGrad = BANNER_GRADIENTS[hashCode(workspace.name || workspace.id) % BANNER_GRADIENTS.length];

  const tabComponents = {
    overview: OverviewTab,
    messages: MessagesTab,
    tasks: TasksTab,
    documents: DocumentsTab,
    members: MembersTab,
    channels: ChannelsTab,
  };

  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: 'Workspaces', to: '/workspaces' },
          { label: workspace.name },
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
            {workspace.avatar_url ? (
              <img
                src={workspace.avatar_url}
                alt={workspace.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-4 ring-white/40 object-cover shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 ring-4 ring-white/40 flex items-center justify-center shadow-xl">
                <span className="text-3xl sm:text-4xl font-bold text-white">
                  {workspace.name?.[0]?.toUpperCase() || 'W'}
                </span>
              </div>
            )}

            <div className="pb-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm truncate">
                {workspace.name}
              </h1>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold ${
                    workspace.visibility === 'Public'
                      ? 'bg-emerald-400/20 text-emerald-100'
                      : 'bg-amber-400/20 text-amber-100'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      workspace.visibility === 'Public' ? 'bg-emerald-300' : 'bg-amber-300'
                    }`}
                  />
                  {workspace.visibility}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                    isArchived ? 'bg-gray-400/20 text-gray-200' : 'bg-emerald-400/20 text-emerald-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-gray-300' : 'bg-emerald-300'}`} />
                  {workspace.status || 'active'}
                </span>
                {workspace.member_count !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {workspace.member_count}
                  </span>
                )}
                {workspace.channel_count !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {workspace.channel_count}
                  </span>
                )}
              </div>
              {workspace.description && (
                <p className="text-sm text-white/70 mt-2 max-w-2xl line-clamp-2">{workspace.description}</p>
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
            <ActiveComponent key={activeTab} workspaceId={wId} workspace={workspace} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
