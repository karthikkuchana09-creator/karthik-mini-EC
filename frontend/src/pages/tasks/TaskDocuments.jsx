import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as taskDocumentsApi from '../../api/taskDocuments';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';
import { formatFileSize, TYPE_STYLES, TYPE_ICONS, DOCUMENT_TYPES } from '../../utils/documents';
import FileDropZone from '../../components/documents/FileDropZone';

export default function TaskDocuments() {
  const { taskId, workspaceId, channelId } = useParams();
  const navigate = useNavigate();
  const tId = Number(taskId);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const backPath = workspaceId
    ? `/workspace-list/${workspaceId}/tasks/${tId}`
    : channelId
      ? `/channel-list/${channelId}/tasks/${tId}`
      : '/tasks';

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskDocumentsApi.getTaskDocuments(tId);
      setDocuments(Array.isArray(data) ? data : data?.documents || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }, [tId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (formData) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await taskDocumentsApi.uploadTaskDocument(tId, formData, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });
      setDocuments((prev) => [...prev, uploaded]);
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (docId) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    try {
      await taskDocumentsApi.deleteTaskDocument(docId);
      toast.success('Document deleted');
    } catch (err) {
      fetchDocuments();
      toast.error(getErrorMessage(err, 'Failed to delete document'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Task
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Task Documents</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage documents attached to this task</p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <FileDropZone onUpload={handleUpload} uploading={uploading} uploadProgress={uploadProgress} />

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No documents attached</p>
              <p className="text-xs text-gray-400 mt-1">Upload a document to this task</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {documents.map((doc) => {
                const type = doc.document_type || doc.type || 'OTHER';
                const typeCfg = DOCUMENT_TYPES.find((dt) => dt.value === type);
                return (
                  <div key={doc.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100/70 hover:border-gray-200 hover:bg-gray-50/50 transition-all shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICONS[type] || TYPE_ICONS.OTHER} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.filename || doc.name || 'Untitled'}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${TYPE_STYLES[type] || TYPE_STYLES.OTHER}`}>
                          {typeCfg?.label || type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{formatFileSize(doc.file_size || doc.size)}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span>{doc.uploaded_by_name || doc.uploaded_by || 'Unknown'}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span>{formatTimestamp(doc.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      <a
                        href={taskDocumentsApi.getTaskDocumentDownloadUrl?.(doc.id) || doc.download_url || '#'}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
