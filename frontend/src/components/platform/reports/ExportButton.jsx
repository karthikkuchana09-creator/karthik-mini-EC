import { useState, useRef, useEffect } from 'react';
import { FiDownload, FiFileText, FiFile, FiCheck } from 'react-icons/fi';

export default function ExportButton({ onExport, loading = false, formats = ['csv', 'json'], className = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format) => {
    setOpen(false);
    setCopied(false);
    try {
      await onExport(format);
    } catch {
      // parent handles errors
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm"
      >
        {copied ? (
          <FiCheck className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <FiDownload className="w-3.5 h-3.5" />
        )}
        Export
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1">
          {formats.includes('csv') && (
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiFileText className="w-3.5 h-3.5 text-green-600" />
              Export as CSV
            </button>
          )}
          {formats.includes('json') && (
            <button
              onClick={() => handleExport('json')}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiFile className="w-3.5 h-3.5 text-indigo-600" />
              Export as JSON
            </button>
          )}
        </div>
      )}
    </div>
  );
}
