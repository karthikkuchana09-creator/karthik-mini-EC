import { FiFileText, FiDownload, FiTrash2, FiImage, FiCode, FiArchive } from 'react-icons/fi';

const TYPE_ICONS = {
  pdf: FiFileText, doc: FiFileText, docx: FiFileText,
  image: FiImage, png: FiImage, jpg: FiImage, jpeg: FiImage, gif: FiImage, svg: FiImage,
  code: FiCode, py: FiCode, js: FiCode, ts: FiCode, jsx: FiCode, tsx: FiCode, html: FiCode, css: FiCode,
  archive: FiArchive, zip: FiArchive, tar: FiArchive, gz: FiArchive,
};

const TYPE_COLORS = {
  pdf: 'text-red-500 bg-red-50', doc: 'text-blue-500 bg-blue-50', docx: 'text-blue-500 bg-blue-50',
  image: 'text-emerald-500 bg-emerald-50',
  code: 'text-violet-500 bg-violet-50',
  archive: 'text-amber-500 bg-amber-50',
};

function getFileMeta(doc) {
  const name = doc.name || doc.filename || doc.title || 'Untitled';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const Icon = TYPE_ICONS[ext] || FiFileText;
  const color = TYPE_COLORS[ext] || TYPE_COLORS.pdf;
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
  return { name, ext, Icon, color, isImage };
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function DocumentCard({ document: doc, onDownload, onDelete, onPreview }) {
  const { name, Icon, color } = getFileMeta(doc);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
      onClick={() => onPreview?.(doc)}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {doc.type || doc.file_type || 'Unknown'}
            {formatSize(doc.size || doc.file_size) && ` \u00B7 ${formatSize(doc.size || doc.file_size)}`}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}>
          {onDownload && <button onClick={() => onDownload(doc)}
            className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Download">
            <FiDownload className="w-3.5 h-3.5" />
          </button>}
          {onDelete && <button onClick={() => onDelete(doc)}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>}
        </div>
      </div>
      {doc.updated_at && (
        <p className="text-[10px] text-gray-400 mt-2">{new Date(doc.updated_at || doc.created_at).toLocaleDateString()}</p>
      )}
    </div>
  );
}
