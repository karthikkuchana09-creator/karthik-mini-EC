import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import * as documentsApi from '../../../api/documents';
import { getErrorMessage } from '../../../utils/errorHandler';
import { formatTimestamp } from '../../../utils/format';

export default function DocumentsTab({ workspaceId }) {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentsApi.getTaskDocuments(workspaceId);
      setDocuments(Array.isArray(data) ? data : data?.documents || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploaded = await documentsApi.uploadDocument(formData);
      setDocuments((prev) => [...prev, uploaded]);
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    try {
      await documentsApi.deleteDocument(docId);
    } catch (err) {
      fetchDocuments();
      toast.error(getErrorMessage(err, 'Failed to delete document'));
    }
  };

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
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        <div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-xs" disabled={uploading}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a document to get started</p>
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
                  href={documentsApi.getDocumentDownloadUrl?.(doc.id) || doc.download_url || '#'}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Download
                </a>
                <button onClick={() => handleDelete(doc.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
