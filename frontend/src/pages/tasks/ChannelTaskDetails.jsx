import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as channelApi from '../../api/channels';
import * as channelTasksApi from '../../api/channelTasks';
import * as taskDocumentsApi from '../../api/taskDocuments';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';
import Breadcrumb from '../../components/ui/Breadcrumb';

const STATUS_STYLES = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-50 text-blue-700',
  review: 'bg-purple-50 text-purple-700',
  done: 'bg-emerald-50 text-emerald-700',
};

const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  critical: 'bg-rose-50 text-rose-700',
};

const STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'done'];

export default function ChannelTaskDetails() {
  const { channelId, taskId } = useParams();
  const navigate = useNavigate();
  const cId = Number(channelId);
  const tId = Number(taskId);
  const fileInputRef = useRef(null);

  const [task, setTask] = useState(null);
  const [channel, setChannel] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ch, ts] = await Promise.all([
        channelApi.getChannel(cId),
        channelTasksApi.getChannelTask(cId, tId),
      ]);
      setChannel(ch);
      setTask(ts);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Task not found');
        navigate(`/channel-list/${cId}/tasks`);
      } else {
        setError(getErrorMessage(err, 'Failed to load task'));
        toast.error(getErrorMessage(err, 'Failed to load task'));
      }
    } finally {
      setLoading(false);
    }
  }, [cId, tId, navigate]);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await taskDocumentsApi.getTaskDocuments(tId);
      setDocuments(Array.isArray(data) ? data : data?.documents || []);
    } catch {
      setDocuments([]);
    }
  }, [tId]);

  useEffect(() => {
    fetchData();
    fetchDocuments();
  }, [fetchData, fetchDocuments]);

  const handleStatusChange = async (newStatus) => {
    setTask((prev) => ({ ...prev, status: newStatus }));
    try {
      const updated = await channelTasksApi.updateChannelTaskStatus(cId, tId, newStatus);
      setTask((prev) => ({ ...prev, ...updated }));
      toast.success('Status updated');
    } catch (err) {
      fetchData();
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await channelTasksApi.deleteChannelTask(cId, tId);
      toast.success('Task deleted');
      navigate(`/channel-list/${cId}/tasks`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete task'));
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploaded = await taskDocumentsApi.uploadTaskDocument(tId, formData);
      setDocuments((prev) => [...prev, uploaded]);
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    try {
      await taskDocumentsApi.deleteTaskDocument(docId);
      toast.success('Document deleted');
    } catch (err) {
      fetchDocuments();
      toast.error(getErrorMessage(err, 'Failed to delete document'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
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
          <button onClick={fetchData} className="btn-secondary text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: 'Channels', to: '/channels' },
          { label: channel?.name || 'Channel', to: `/channel-list/${cId}` },
          { label: 'Tasks', to: `/channel-list/${cId}/tasks` },
          { label: task.title },
        ]}
      />

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 break-words">{task.title}</h1>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap leading-relaxed">{task.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={task.status || 'todo'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer ${STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-700'}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger text-xs px-3 py-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-700'}`}>
                    {task.status?.replace('_', ' ') || 'todo'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Priority</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority] || 'bg-slate-100 text-slate-700'}`}>
                    {task.priority || 'medium'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Due Date</h4>
                  <p className="text-sm text-gray-900 tabular-nums">{task.due_date ? formatTimestamp(task.due_date) : 'Not set'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Assignee</h4>
                  <p className="text-sm text-gray-900">{task.assigned_to_name || 'Unassigned'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Workspace</h4>
                  <p className="text-sm text-gray-900">{channel?.workspace_name || task.workspace_name || '-'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Channel</h4>
                  <p className="text-sm text-gray-900 font-medium">#{channel?.name || task.channel_name || '-'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Created</h4>
                  <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(task.created_at)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Updated</h4>
                  <p className="text-sm text-gray-900 tabular-nums">{formatTimestamp(task.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Documents
                <span className="ml-2 text-sm font-normal text-gray-400">({documents.length})</span>
              </h2>
              <div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary text-xs"
                  disabled={uploading}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No documents yet</p>
                <p className="text-xs text-gray-400 mt-1">Upload a document to attach to this task</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100/50">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.filename || doc.name || 'Untitled'}</p>
                      <p className="text-xs text-gray-400">{formatTimestamp(doc.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={taskDocumentsApi.getTaskDocumentDownloadUrl?.(doc.id) || doc.download_url || '#'}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
