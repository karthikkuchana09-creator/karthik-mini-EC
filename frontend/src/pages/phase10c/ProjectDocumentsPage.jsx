import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FiFileText, FiUpload, FiDownload, FiTrash2, FiFile, FiImage, FiEye, FiUser, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { projectDocumentService } from '../../services/projectDocumentService';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatFileSize } from '../../utils/documents';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DOCUMENT_TYPE_CONFIG = {
  REQUIREMENT: { label: 'Requirement', bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  DESIGN: { label: 'Design', bg: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  TEST: { label: 'Test', bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  RELEASE: { label: 'Release', bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  OTHER: { label: 'Other', bg: 'bg-gray-50 text-gray-600', dot: 'bg-gray-400' },
};

const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_CONFIG).map(([value, cfg]) => ({
  value, label: cfg.label,
}));

function getFileType(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['txt', 'csv', 'json', 'xml', 'md'].includes(ext)) return 'text';
  return 'other';
}

const FILE_ICON_MAP = {
  pdf: { Icon: FiFileText, color: 'text-red-500', bg: 'bg-red-50' },
  doc: { Icon: FiFileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  sheet: { Icon: FiFileText, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  presentation: { Icon: FiFileText, color: 'text-orange-500', bg: 'bg-orange-50' },
  image: { Icon: FiImage, color: 'text-purple-500', bg: 'bg-purple-50' },
  archive: { Icon: FiFile, color: 'text-amber-500', bg: 'bg-amber-50' },
  text: { Icon: FiFileText, color: 'text-gray-500', bg: 'bg-gray-50' },
  other: { Icon: FiFile, color: 'text-gray-400', bg: 'bg-gray-100' },
};

function PreviewContent({ doc, pid }) {
  const fileType = getFileType(doc.filename || doc.name);
  const fmt = FILE_ICON_MAP[fileType] || FILE_ICON_MAP.other;
  const docTypeCfg = DOCUMENT_TYPE_CONFIG[doc.document_type] || DOCUMENT_TYPE_CONFIG.OTHER;
  const isImage = fileType === 'image';
  const previewUrl = isImage
    ? `${import.meta.env.VITE_API_URL || ''}/projects/${pid}/documents/${doc.id}/download`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className={`w-14 h-14 rounded-xl ${fmt.bg} flex items-center justify-center flex-shrink-0`}>
          <fmt.Icon className={`w-7 h-7 ${fmt.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{doc.filename || doc.name || 'Untitled'}</p>
          <p className="text-xs text-gray-500">{formatFileSize(doc.file_size || doc.size || 0)}</p>
        </div>
      </div>

      {isImage && previewUrl && (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          <img src={previewUrl} alt={doc.filename || doc.name}
            className="max-h-64 mx-auto object-contain"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Type</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${docTypeCfg.bg}`}>
            {docTypeCfg.label}
          </span>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Size</p>
          <p className="text-xs font-semibold text-gray-900">{formatFileSize(doc.file_size || doc.size || 0)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Uploaded By</p>
          <p className="text-xs font-semibold text-gray-900 truncate flex items-center justify-center gap-1">
            <FiUser className="w-3 h-3 text-gray-400" />
            {doc.uploaded_by?.name || doc.uploaded_by_name || doc.uploader || 'Unknown'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Created</p>
          <p className="text-xs font-semibold text-gray-900 flex items-center justify-center gap-1">
            <FiCalendar className="w-3 h-3 text-gray-400" />
            {doc.created_at || doc.createdAt ? new Date(doc.created_at || doc.createdAt).toLocaleDateString() : '-'}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => {
          projectDocumentService.downloadProjectDocument(pid, doc.id).then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.filename || doc.name || 'document';
            a.click();
            window.URL.revokeObjectURL(url);
          }).catch((err) => toast.error(getErrorMessage(err, 'Download failed')));
        }} className="btn-primary btn-sm flex-1">
          <FiDownload className="w-3.5 h-3.5" /> Download
        </button>
      </div>
    </div>
  );
}

export default function ProjectDocumentsPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('REQUIREMENT');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectDocumentService.getProjectDocuments(pid);
      setDocuments(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load documents'));
      toast.error(getErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be under 10MB');
      return;
    }
    setUploadFile(file);
    setUploadDocType('REQUIREMENT');
    setShowUploadModal(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadDocType);
      await projectDocumentService.uploadProjectDocument(pid, formData, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || uploadFile.size));
        setUploadProgress(pct);
      });
      toast.success('Document uploaded');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadProgress(0);
      fetchDocuments();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc) {
    try {
      const blob = await projectDocumentService.downloadProjectDocument(pid, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || doc.name || 'document';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to download document'));
    }
  }

  async function handleDelete() {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      await projectDocumentService.deleteProjectDocument(pid, deleteDoc.id);
      toast.success('Document deleted');
      setDeleteDoc(null);
      fetchDocuments();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete document'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="py-8"><LoadingSpinner text="Loading documents..." /></div>;
  if (error) return (
    <div className="py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchDocuments} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiFileText className="w-4 h-4 text-gray-500" />
          Documents <span className="text-gray-400 font-normal">({documents.length})</span>
        </h3>
        <div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary btn-sm">
            <FiUpload className="w-3.5 h-3.5" />
            {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
          </button>
        </div>
      </div>

      {uploading && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
            <span>Uploading {uploadFile?.name}...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FiFileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Upload project documents, requirements, and designs</p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary btn-sm">
            <FiUpload className="w-3.5 h-3.5" /> Upload Document
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const fileType = getFileType(doc.filename || doc.name);
                const fmt = FILE_ICON_MAP[fileType] || FILE_ICON_MAP.other;
                const docTypeCfg = DOCUMENT_TYPE_CONFIG[doc.document_type] || DOCUMENT_TYPE_CONFIG.OTHER;
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setPreviewDoc(doc)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${fmt.bg} flex items-center justify-center flex-shrink-0`}>
                          <fmt.Icon className={`w-4 h-4 ${fmt.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">{doc.filename || doc.name || 'Untitled'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${docTypeCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${docTypeCfg.dot}`} />
                        {docTypeCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <FiUser className="w-3 h-3 text-gray-400" />
                        {doc.uploaded_by?.name || doc.uploaded_by_name || doc.uploader || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatFileSize(doc.file_size || doc.size || 0)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {doc.created_at || doc.createdAt ? new Date(doc.created_at || doc.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Preview">
                          <FiEye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDownload(doc)}
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Download">
                          <FiDownload className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteDoc(doc)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showUploadModal} onClose={() => { setShowUploadModal(false); setUploadFile(null); }}
        title="Upload Document" size="sm">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Selected file</p>
            <p className="text-sm font-medium text-gray-900 truncate">{uploadFile?.name}</p>
            <p className="text-[11px] text-gray-400">{uploadFile ? formatFileSize(uploadFile.size) : ''}</p>
          </div>
          <div>
            <label className="label">Document Type</label>
            <div className="grid grid-cols-2 gap-2">
              {DOCUMENT_TYPE_OPTIONS.map(({ value, label }) => {
                const cfg = DOCUMENT_TYPE_CONFIG[value];
                const isSelected = uploadDocType === value;
                return (
                  <button key={value} type="button" onClick={() => setUploadDocType(value)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all text-left ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                    <span className={`inline-flex items-center gap-1 ${cfg.bg} px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setShowUploadModal(false); setUploadFile(null); }}
              className="btn-secondary" disabled={uploading}>Cancel</button>
            <button type="button" onClick={handleUpload} disabled={uploading} className="btn-primary">
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </span>
              ) : 'Upload'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} title="Document Details" size="md">
        {previewDoc && <PreviewContent doc={previewDoc} pid={pid} />}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDoc?.filename || deleteDoc?.name || 'this document'}"? This action cannot be undone.`}
        confirmText={deleting ? 'Deleting...' : 'Delete Document'}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
