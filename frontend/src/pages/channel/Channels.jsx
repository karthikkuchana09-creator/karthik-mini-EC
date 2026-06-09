import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as channelApi from '../../api/channels';
import * as workspaceApi from '../../api/workspaces';
import { getErrorMessage } from '../../utils/errorHandler';
import ChannelCard from '../../components/channel/ChannelCard';
import ChannelTable from '../../components/channel/ChannelTable';
import ChannelModal from '../../components/channel/ChannelModal';
import Modal from '../../components/ui/Modal';

const VIEW_ICONS = {
  grid: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  list: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
};

export default function Channels() {
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceFilter = searchParams.get('workspace_id') || '';

  const [channels, setChannels] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [userChannelIds, setUserChannelIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, allChannels] = await Promise.all([
        workspaceApi.getWorkspaces(),
        channelApi.getChannels(),
      ]);
      const wsList = Array.isArray(ws) ? ws : ws?.workspaces || [];
      setWorkspaces(wsList);

      const chList = Array.isArray(allChannels) ? allChannels : allChannels?.channels || [];
      const chWithMember = chList.map((ch) => ({
        ...ch,
        _is_member: ch.is_member ?? false,
        status: ch.is_archived ? 'archived' : 'active',
      }));
      setChannels(chWithMember);
      setUserChannelIds(new Set(chWithMember.filter((ch) => ch._is_member).map((ch) => ch.id)));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load channels'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (data) => {
    try {
      const created = await channelApi.createChannel(data);
      setChannels((prev) => [...prev, { ...created, _is_member: false }]);
      toast.success('Channel created successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create channel'));
      throw err;
    }
  };

  const handleArchive = async (ch) => {
    try {
      const updated = await channelApi.archiveChannel(ch.id);
      setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, ...updated, status: 'archived' } : c)));
      toast.success('Channel archived');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive channel'));
    }
  };

  const handleRestore = async (ch) => {
    try {
      const updated = await channelApi.restoreChannel(ch.id);
      setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, ...updated, status: 'active' } : c)));
      toast.success('Channel restored');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to restore channel'));
    }
  };

  const handleJoin = async (ch) => {
    setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, _is_member: true } : c)));
    setUserChannelIds((prev) => new Set([...prev, ch.id]));
    try {
      await channelApi.joinChannel(ch.id);
      toast.success(`Joined #${ch.name}`);
    } catch (err) {
      setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, _is_member: false } : c)));
      setUserChannelIds((prev) => { const next = new Set(prev); next.delete(ch.id); return next; });
      toast.error(getErrorMessage(err, 'Failed to join channel'));
    }
  };

  const handleLeave = async (ch) => {
    setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, _is_member: false } : c)));
    setUserChannelIds((prev) => { const next = new Set(prev); next.delete(ch.id); return next; });
    try {
      await channelApi.leaveChannel(ch.id);
      toast.success(`Left #${ch.name}`);
    } catch (err) {
      setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, _is_member: true } : c)));
      setUserChannelIds((prev) => new Set([...prev, ch.id]));
      toast.error(getErrorMessage(err, 'Failed to leave channel'));
    }
  };

  const filtered = channels.filter((ch) => {
    const q = search.toLowerCase();
    if (q && !ch.name?.toLowerCase().includes(q) && !ch.description?.toLowerCase().includes(q)) return false;
    if (workspaceFilter && ch.workspace_id?.toString() !== workspaceFilter) return false;
    if (filter === 'active') return ch.status !== 'archived';
    if (filter === 'archived') return ch.status === 'archived';
    return true;
  });

  const activeCount = channels.filter((c) => c.status !== 'archived').length;
  const archivedCount = channels.filter((c) => c.status === 'archived').length;

  const FILTER_TABS = [
    { key: 'all', label: 'All', count: channels.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'archived', label: 'Archived', count: archivedCount },
  ];

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Channels</h1>
          <p className="page-subtitle">
            Browse and manage channels across your workspaces
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Channel
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            className="input pl-10"
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="select text-xs max-w-[180px]"
            value={workspaceFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSearchParams(val ? { workspace_id: val } : {});
            }}
          >
            <option value="">All Workspaces</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>

          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-gray-400">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {['grid', 'list'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`p-1.5 rounded-md transition-all ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
                title={v === 'grid' ? 'Card view' : 'Table view'}
              >
                {VIEW_ICONS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
                  <div className="h-16 bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">
            {search || workspaceFilter ? 'No channels match your filters' : 'No channels yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search || workspaceFilter ? 'Try different search terms' : 'Create your first channel'}
          </p>
          {!search && !workspaceFilter && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Create Channel
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              isMember={userChannelIds.has(ch.id)}
              onArchive={(c) => setArchiveTarget(c)}
              onRestore={handleRestore}
              onJoin={handleJoin}
              onLeave={handleLeave}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <ChannelTable
            channels={filtered}
            onArchive={(c) => setArchiveTarget(c)}
            onRestore={handleRestore}
            onJoin={handleJoin}
            onLeave={handleLeave}
          />
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        Showing {filtered.length} of {channels.length} channel{channels.length !== 1 ? 's' : ''}
      </div>

      <ChannelModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        workspaces={workspaces}
      />

      {archiveTarget && (
        <Modal isOpen={true} onClose={() => setArchiveTarget(null)} size="sm">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Channel</h3>
            <p className="text-sm text-gray-500 mb-2">
              This will archive the channel and make it inaccessible.
            </p>
            <p className="text-xs font-medium text-gray-700 mb-6 bg-gray-50 rounded-lg px-3 py-2">
              &quot;{archiveTarget.name}&quot;
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setArchiveTarget(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => { handleArchive(archiveTarget); setArchiveTarget(null); }} className="btn-danger">Archive</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
