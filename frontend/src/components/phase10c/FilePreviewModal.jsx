import { FiDownload, FiFileText, FiImage } from 'react-icons/fi';
import Modal from '../ui/Modal';

function getFileExt(name) {
  return (name?.split('.').pop() || '').toLowerCase();
}

function isPreviewableImage(ext) {
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext);
}

function isPreviewableText(ext) {
  return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'log'].includes(ext);
}

export default function FilePreviewModal({ isOpen, onClose, file, onDownload }) {
  if (!file) return null;

  const name = file.name || file.filename || file.title || 'Untitled';
  const ext = getFileExt(name);
  const fileUrl = file.url || file.file_url || file.download_url || '';
  const canPreviewImage = isPreviewableImage(ext) && fileUrl;
  const canPreviewText = isPreviewableText(ext) && fileUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File Preview" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FiFileText className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
            <span className="text-[10px] text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{ext}</span>
          </div>
          {onDownload && (
            <button onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors">
              <FiDownload className="w-3.5 h-3.5" /> Download
            </button>
          )}
        </div>

        {canPreviewImage ? (
          <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center max-h-[60vh] overflow-auto">
            <img src={fileUrl} alt={name} className="max-w-full max-h-[55vh] object-contain rounded" />
          </div>
        ) : canPreviewText ? (
          <div className="bg-gray-50 rounded-lg p-4 max-h-[50vh] overflow-auto">
            <p className="text-xs text-gray-400 italic">Text preview not loaded. Download the file to view contents.</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <FiImage className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Preview not available for this file type</p>
            <p className="text-xs text-gray-400 mt-1">Download the file to view it locally.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
