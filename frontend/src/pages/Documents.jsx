import { useState, useEffect } from 'react';
import { getTaskDocuments, getDocumentDownloadUrl } from '../api/documents';
import { getTasks } from '../api/tasks';
import DocumentUpload from '../components/DocumentUpload';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { SkeletonTableRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function Documents() {
  const { isAdminOrManager, role } = useRolePermissions();
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [expandedDoc, setExpandedDoc] = useState(null);

  useEffect(() => {
    getTasks()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.tasks || data.results || [];
        setTasks(list);
      })
      .catch(() => {});
  }, []);

  const loadDocuments = async (taskId) => {
    if (!taskId) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getTaskDocuments(taskId);
      const list = Array.isArray(data) ? data : data.documents || data.results || [];
      setDocuments(list);
    } catch {
      setDocuments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments(selectedTaskId);
  }, [selectedTaskId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Documents</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {isAdminOrManager ? 'Manage team task documents' : 'Upload and download task documents'}
          </p>
        </div>
        <button
          onClick={() => {
            setUploadTaskId(selectedTaskId);
            setShowUpload(true);
          }}
          disabled={!selectedTaskId}
          className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.97]"
        >
          <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload Document
        </button>
      </div>

      <div className="mb-6 bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Filter by Task
        </label>
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full sm:max-w-xs px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-gray-50/50 hover:bg-white transition-colors"
        >
          <option value="">Select a task...</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title || `Task #${t.id}`}
            </option>
          ))}
        </select>
      </div>

      {!selectedTaskId ? (
        <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-200/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 font-semibold">Select a task to view documents</p>
          <p className="text-sm text-gray-400 mt-1">Choose a task from the filter above.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <SkeletonTableRows rows={4} cols={isAdminOrManager ? 6 : 5} />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm">
          <EmptyState
            title="No documents yet"
            description="Upload the first document for this task."
            action={
              <button
                onClick={() => { setUploadTaskId(selectedTaskId); setShowUpload(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.97]"
              >
                Upload Document
              </button>
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">File Name</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Version</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                  {isAdminOrManager && <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded By</th>}
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    expanded={expandedDoc === doc.id}
                    onToggle={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    isAdminOrManager={isAdminOrManager}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Upload Document</h3>
              <button onClick={() => setShowUpload(false)} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all active:scale-95">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DocumentUpload
              taskId={uploadTaskId}
              onSuccess={() => { loadDocuments(selectedTaskId); setShowUpload(false); }}
              onClose={() => setShowUpload(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentRow({ doc, expanded, onToggle, isAdminOrManager }) {
  const versions = doc.versions || doc.version_history || [];
  const hasVersions = versions.length > 1;
  const colCount = isAdminOrManager ? 6 : 5;

  return (
    <>
      <tr className="group hover:bg-gray-50/70 transition-all duration-150">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{doc.file_name || doc.filename || 'Unnamed'}</p>
              {hasVersions && (
                <button
                  onClick={onToggle}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-0.5 transition-colors"
                >
                  {expanded ? 'Hide history' : `${versions.length} versions`}
                </button>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200/50">
            v{doc.version || '1.0'}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{formatSize(doc.file_size)}</td>
        {isAdminOrManager && (
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 text-[10px] font-semibold ring-2 ring-white shadow-sm shrink-0">
                {(doc.uploaded_by?.email || doc.uploaded_by?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600 truncate max-w-[120px]">
                {doc.uploaded_by?.email || doc.uploaded_by?.name || 'Unknown'}
              </span>
            </div>
          </td>
        )}
        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(doc.created_at)}</td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <a
              href={getDocumentDownloadUrl(doc.id)}
              className="group inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-95"
            >
              <svg className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </a>
          </div>
        </td>
      </tr>
      {expanded && hasVersions && (
        <tr key={`${doc.id}-versions`}>
          <td colSpan={colCount} className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
            <div className="ml-12 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Version History</p>
              {versions.map((v, i) => (
                <div key={v.id || i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200/50">
                      v{v.version || `${i + 1}.0`}
                    </span>
                    <span className="text-sm text-gray-600">{v.file_name || doc.file_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">{formatDate(v.created_at)}</span>
                    <a
                      href={getDocumentDownloadUrl(v.id || doc.id)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default Documents;
