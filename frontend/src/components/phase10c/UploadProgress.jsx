import { FiFile, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';

export default function UploadProgress({ file, progress, status = 'uploading', onCancel }) {
  const pct = Math.min(Math.round(progress || 0), 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FiFile className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-700 truncate">{file?.name || 'Uploading...'}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'uploading' && onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-red-500 transition-colors">
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
          {status === 'done' && <FiCheckCircle className="w-4 h-4 text-emerald-500" />}
          {status === 'error' && <FiAlertCircle className="w-4 h-4 text-red-500" />}
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${
          status === 'error' ? 'bg-red-500' : status === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'
        }`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-gray-400">
          {status === 'uploading' ? 'Uploading...' : status === 'done' ? 'Upload complete' : 'Upload failed'}
        </span>
        <span className="text-[10px] font-medium text-gray-500">{pct}%</span>
      </div>
    </div>
  );
}
