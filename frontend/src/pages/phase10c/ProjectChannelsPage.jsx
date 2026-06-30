import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiPlus, FiEdit2, FiX, FiHash, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { projectService } from '../../services/projectService';
import { getErrorMessage } from '../../utils/errorHandler';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TYPE_CONFIG = {
  Public: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  Private: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  Announcement: { bg: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  Project: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
};

const TYPE_OPTIONS = ['Public', 'Private', 'Announcement', 'Project'];

function formatLastActivity(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ProjectChannelsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const pid = Number(projectId);

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelType, setChannelType] = useState('Public');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjectChannels(pid);
      setChannels(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load channels'));
      toast.error(getErrorMessage(err, 'Failed to load channels'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  function openCreate() {
    setEditingChannel(null);
    setChannelName('');
    setChannelDesc('');
    setChannelType('Public');
    setShowModal(true);
  }

  function openEdit(channel) {
    setEditingChannel(channel);
    setChannelName(channel.name || '');
    setChannelDesc(channel.description || '');
    setChannelType(channel.type || 'Public');
    setShowModal(true);
  }

  async function handleSave() {
    if (!channelName.trim()) return;
    setSaving(true);
    try {
      if (editingChannel) {
        await projectService.updateProjectChannel(pid, editingChannel.id, {
          name: channelName.trim(),
          description: channelDesc.trim(),
          type: channelType,
        });
        toast.success('Channel updated');
      } else {
        await projectService.createProjectChannel(pid, {
          name: channelName.trim(),
          description: channelDesc.trim(),
          type: channelType,
        });
        toast.success('Channel created');
      }
      setShowModal(false);
      setEditingChannel(null);
      fetchChannels();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save channel'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await projectService.deleteProjectChannel(pid, confirmDelete.id);
      toast.success('Channel deleted');
      setConfirmDelete(null);
      fetchChannels();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete channel'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="py-8"><LoadingSpinner text="Loading channels..." /></div>;
  if (error) return (
    <div className="py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchChannels} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiMessageSquare className="w-4 h-4 text-gray-500" />
          Channels <span className="text-gray-400 font-normal">({channels.length})</span>
        </h3>
        <button onClick={openCreate} className="btn-secondary btn-sm">
          <FiPlus className="w-3.5 h-3.5" /> New Channel
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FiMessageSquare className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No channels yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Create channels for team collaboration on this project</p>
          <button onClick={openCreate} className="btn-primary btn-sm">
            <FiPlus className="w-3.5 h-3.5" /> New Channel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((ch) => {
            const typeCfg = TYPE_CONFIG[ch.type] || TYPE_CONFIG.Public;
            const lastActivity = formatLastActivity(ch.last_activity || ch.updated_at || ch.created_at);
            return (
              <div
                key={ch.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
                onClick={() => navigate(`/channels/${ch.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FiHash className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {ch.name}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(ch)}
                          className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit channel">
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(ch)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete channel">
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeCfg.dot}`} />
                        {ch.type || 'Public'}
                      </span>
                      {ch.member_count !== undefined && (
                        <span className="text-[10px] text-gray-400">{ch.member_count} member{ch.member_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {ch.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{ch.description}</p>
                    )}
                    {lastActivity && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                        <FiClock className="w-3 h-3" />
                        {lastActivity}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingChannel(null); }}
        title={editingChannel ? 'Edit Channel' : 'Create Channel'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label-required">Channel Name</label>
            <input className="input" placeholder="e.g. frontend-dev"
              value={channelName} onChange={(e) => setChannelName(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[60px] resize-none" placeholder="What is this channel for?"
              rows={2} value={channelDesc} onChange={(e) => setChannelDesc(e.target.value)} />
          </div>
          {!editingChannel && (
            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  const isSelected = channelType === t;
                  return (
                    <button key={t} type="button" onClick={() => setChannelType(t)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all text-left ${
                        isSelected
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}>
                      <span className={`inline-flex items-center gap-1.5 ${cfg.bg} px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {t}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setShowModal(false); setEditingChannel(null); }}
              className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={!channelName.trim() || saving} className="btn-primary">
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : editingChannel ? 'Update Channel' : 'Create Channel'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Channel"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText={deleting ? 'Deleting...' : 'Delete Channel'}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
