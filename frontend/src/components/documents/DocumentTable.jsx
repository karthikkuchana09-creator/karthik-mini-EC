import { formatTimestamp } from '../../utils/format';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';

const TYPE_STYLES = {
  REQUIREMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  SPECIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
  REFERENCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELIVERABLE: 'bg-amber-50 text-amber-700 border-amber-200',
  OTHER: 'bg-gray-50 text-gray-600 border-gray-200',
};

function formatFileSize(bytes) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function DocumentTable({ documents, loading, onDownload, onDelete }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return <EmptyState preset="noDocuments" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="text-left py-3 px-4">File Name</th>
            <th className="text-left py-3 px-4">Document Type</th>
            <th className="text-left py-3 px-4">Uploaded By</th>
            <th className="text-left py-3 px-4">File Size</th>
            <th className="text-left py-3 px-4">Upload Date</th>
            <th className="text-right py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {documents.map((doc) => {
            const type = doc.document_type || doc.type || 'OTHER';
            const typeStyle = TYPE_STYLES[type] || TYPE_STYLES.OTHER;
            return (
              <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {doc.filename || doc.name || 'Untitled'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeStyle}`}>
                    {type}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {doc.uploaded_by_name || doc.uploaded_by || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {formatFileSize(doc.file_size || doc.size)}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                  {formatTimestamp(doc.created_at)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onDownload && (
                      <button
                        onClick={() => onDownload(doc)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                      >
                        Download
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(doc)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
