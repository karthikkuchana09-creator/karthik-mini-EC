import { useState, useRef } from 'react';
import { validateFile, formatFileSize, DOCUMENT_TYPES } from '../../utils/documents';

export default function FileDropZone({ onUpload, uploading = false, uploadProgress = 0, children }) {
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('OTHER');

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    const result = validateFile(file);
    if (!result.valid) {
      return;
    }
    setSelectedFile(file);
    setDocType('OTHER');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', docType);
    await onUpload(formData);
    setSelectedFile(null);
    setDocType('OTHER');
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 border-dashed p-8 sm:p-10 text-center transition-all ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50/50'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
        }`}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
              {!uploading && (
                <button onClick={cancelSelection} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                disabled={uploading}
                className="input text-sm py-2 px-3 w-full sm:w-auto"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary text-sm px-5 w-full sm:w-auto"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            {uploading && (
              <div className="w-full max-w-md mx-auto">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 hover:text-indigo-800 font-semibold">
                  Click to upload
                </button>
                {' '}or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOC, XLS, PPT, TXT, CSV, images — up to 10 MB
              </p>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleInputChange} />
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
