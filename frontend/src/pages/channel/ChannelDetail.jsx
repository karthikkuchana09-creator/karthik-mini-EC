import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as channelApi from '../../api/channels';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';
import ChannelModal from '../../components/channel/ChannelModal';
import JoinChannelButton from '../../components/channel/JoinChannelButton';
import Modal from '../../components/ui/Modal';

const TYPE_CONFIG = {
  Public: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', gradient: 'from-blue-500 to-indigo-600' },
  Private: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', gradient: 'from-amber-500 to-orange-600' },
  Announcement: { bg: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500', gradient: 'from-purple-500 to-violet-600' },
  Project: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500', gradient: 'from-orange-500 to-rose-600' },
};

const BANNER_GRADIENTS = [
  'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
  'from-purple-500 to-violet-600', 'from-orange-500 to-rose-600',
  'from-cyan-500 to-blue-600', 'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600', 'from-teal-500 to-cyan-600',
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

export default function ChannelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const channelId = Number(id);

  const [channel, setChannel] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const fetchChannel = useCallback(async () => {
    setLoading(true);
    try {
      const data = await channelApi.getChannel(channelId);
      setChannel(data);
      setIsMember(data.is_member ?? false);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Channel not found');
        navigate('/channels');
      } else {
        toast.error(getErrorMessage(err, 'Failed to load channel'));
      }
    } finally {
      setLoading(false);
    }
  }, [channelId, navigate]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  const handleUpdate = async (data) => {
    try {
      const updated = await channelApi.updateChannel(channelId, data);
      setChannel((prev) => ({ ...prev, ...updated }));
      toast.success('Channel updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update channel'));
      throw err;
    }
  };

  const handleArchive = async () => {
    try {
      const updated = await channelApi.archiveChannel(channelId);
      setChannel((prev) => ({ ...prev, ...updated, status: 'archived' }));
      setShowArchive(false);
      toast.success('Channel archived');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive channel'));
    }
  };

  const handleRestore = async () => {
    try {
      const updated = await channelApi.restoreChannel(channelId);
      setChannel((prev) => ({ ...prev, ...updated, status: 'active' }));
      toast.success('Channel restored');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to restore channel'));
    }
  };

  const handleJoin = async () => {
    setIsMember(true);
    try {
      await channelApi.joinChannel(channelId);
      toast.success(`Joined #${channel.name}`);
    } catch (err) {
      setIsMember(false);
      toast.error(getErrorMessage(err, 'Failed to join channel'));
    }
  };

  const handleLeave = async () => {
    setIsMember(false);
    try {
      await channelApi.leaveChannel(channelId);
      toast.success(`Left #${channel.name}`);
    } catch (err) {
      setIsMember(true);
      toast.error(getErrorMessage(err, 'Failed to leave channel'));
    }
  };

  if (loading) {
    return (
      <div className="page-container max-w-4xl">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!channel) return null;

  const typeCfg = TYPE_CONFIG[channel.type] || TYPE_CONFIG.Public;
  const isArchived = channel.status === 'archived';
  const bannerGrad = BANNER_GRADIENTS[hashCode(channel.name || channel.id) % BANNER_GRADIENTS.length];

  return (
    <div className="page-container max-w-4xl">
      <button
        onClick={() => navigate('/channels')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Channels
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className={`h-28 bg-gradient-to-br ${bannerGrad} relative flex items-end p-6`}>
          {isArchived && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-gray-500">
              Archived
            </div>
          )}
          <div className="flex items-end gap-4">
            <div className={`w-14 h-14 rounded-xl bg-white/20 ring-2 ring-white/40 flex items-center justify-center shadow-lg`}>
              <span className="text-2xl font-bold text-white">#</span>
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">{channel.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeCfg.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${typeCfg.dot}`} />
                  {channel.type}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                  isArchived ? 'bg-gray-200/90 text-gray-600' : 'bg-emerald-100/90 text-emerald-800'
                }`}>
                  {channel.status}
                </span>
                {channel.member_count !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/80">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {channel.member_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {channel.description && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{channel.description}</p>
            </div>
          )}

          {channel.workspace_name && (
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs text-gray-400">Part of</span>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{channel.workspace_name}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created</h3>
              <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(channel.created_at)}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Updated</h3>
              <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(channel.updated_at)}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Channel ID</h3>
              <p className="text-sm text-gray-900 tabular-nums font-mono">#{channel.id}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center gap-3 pt-4 border-t border-gray-100">
          <JoinChannelButton
            channel={channel}
            isMember={isMember}
            onJoin={handleJoin}
            onLeave={handleLeave}
            size="md"
          />
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary"
            disabled={isArchived}
            title={isArchived ? 'Cannot edit archived channel' : undefined}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit
          </button>
          {isArchived ? (
            <button
              onClick={handleRestore}
              className="btn-secondary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Restore
            </button>
          ) : (
            <button
              onClick={() => setShowArchive(true)}
              className="btn-danger"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              Archive
            </button>
          )}
        </div>
      </div>

      <ChannelModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={handleUpdate}
        channel={channel}
      />

      {showArchive && (
        <Modal isOpen={true} onClose={() => setShowArchive(false)} size="sm">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Channel</h3>
            <p className="text-sm text-gray-500 mb-2">This will archive the channel and make it inaccessible.</p>
            <p className="text-xs font-medium text-gray-700 mb-6 bg-gray-50 rounded-lg px-3 py-2">&quot;{channel.name}&quot;</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowArchive(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleArchive} className="btn-danger">Archive</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
