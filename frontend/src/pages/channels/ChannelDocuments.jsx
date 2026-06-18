import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as channelApi from '../../api/channels';
import * as documentsApi from '../../api/documents';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';

export default function ChannelDocuments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const channelId = Number(id);
  const fileInputRef = useRef(null);

  const [channel, setChannel] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ch, docs] = await Promise.all([
        channelApi.getChannel(channelId),
        documentsApi.getTaskDocuments(channelId),
      ]);
      setChannel(ch);
      setDocuments(Array.isArray(docs) ? docs : docs?.documents || []);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Channel not found');
        navigate('/channels');
      } else {
        setError(getErrorMessage(err, 'Failed to load documents'));
        toast.error(getErrorMessage(err, 'Failed to load documents'));
      }
    } finally {
      setLoading(false);
    }
  }, [channelId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      toast.success('Document deleted');
    } catch (err) {
      fetchData();
      toast.error(getErrorMessage(err, 'Failed to delete document'));
    }
  };

  if (loading) {
    return (
      <div className="page-container max-w-4xl">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
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

  if (!channel) return null;

  const NAV_TABS = [
    { label: 'Overview', path: `/channels/${channel.id}` },
    { label: 'Messages', path: `/channels/${channel.id}/messages` },
    { label: 'Tasks', path: `/channels/${channel.id}/tasks` },
    { label: 'Documents', path: `/channels/${channel.id}/documents` },
  ];

  return (
    <div className="page-container max-w-4xl">
      <button onClick={() => navigate(`/channels/${channel.id}`)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to #{channel.name}
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900"># {channel.name} — Documents</h1>
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
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No documents yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload a document to this channel</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.filename || doc.name || 'Untitled'}</p>
                    <p className="text-xs text-gray-400">{formatTimestamp(doc.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={doc.download_url || documentsApi.getDocumentDownloadUrl?.(doc.id) || '#'} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Download</a>
                    <button onClick={() => handleDelete(doc.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
