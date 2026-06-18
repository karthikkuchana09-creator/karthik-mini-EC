import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as approvalDocumentsApi from '../../api/approvalDocuments';
import { getErrorMessage } from '../../utils/errorHandler';
import DocumentTable from '../../components/documents/DocumentTable';
import FileDropZone from '../../components/documents/FileDropZone';

export default function ApprovalDocuments() {
  const { approvalId } = useParams();
  const navigate = useNavigate();
  const aId = Number(approvalId);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await approvalDocumentsApi.getApprovalDocuments(aId);
      setDocuments(Array.isArray(data) ? data : data?.documents || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }, [aId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (formData) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await approvalDocumentsApi.uploadApprovalDocument(aId, formData, (progressEvent) => {
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

  const handleDelete = async (doc) => {
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    try {
      await approvalDocumentsApi.deleteApprovalDocument(doc.id);
      toast.success('Document deleted');
    } catch (err) {
      fetchDocuments();
      toast.error(getErrorMessage(err, 'Failed to delete document'));
    }
  };

  const handleDownload = (doc) => {
    const url = approvalDocumentsApi.getApprovalDocumentDownloadUrl(doc.id);
    window.open(url, '_blank');
  };

  return (
    <div className="page-container max-w-4xl">
      <button onClick={() => navigate('/approvals')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Approvals
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Approval Documents</h1>
          <p className="text-xs text-gray-400 mt-0.5">Documents attached to approval #{aId}</p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <FileDropZone onUpload={handleUpload} uploading={uploading} uploadProgress={uploadProgress} />

          {error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-3 rounded-full bg-red-50 mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Failed to load documents</p>
              <p className="text-xs text-gray-500 mb-4">{error}</p>
              <button onClick={fetchDocuments} className="btn-secondary text-sm">
                Try Again
              </button>
            </div>
          ) : (
            <DocumentTable
              documents={documents}
              loading={loading}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
