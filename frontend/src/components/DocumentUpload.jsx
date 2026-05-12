import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'png', 'jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getFileIcon(type) {
  if (type === 'pdf') return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
  if (type === 'docx') return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
}

function getFileTypeLabel(type) {
  return type.toUpperCase();
}

function getFileColor(type) {
  if (type === 'pdf') return 'bg-red-50 text-red-600';
  if (type === 'docx') return 'bg-blue-50 text-blue-600';
  if (type === 'png' || type === 'jpg') return 'bg-green-50 text-green-600';
  return 'bg-gray-50 text-gray-600';
}

function DocumentUpload({ taskId, onSuccess, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateFile = useCallback((f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Invalid format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File too large. Max size: 10MB');
      return false;
    }
    if (f.size === 0) {
      setError('File is empty');
      return false;
    }
    return true;
  }, []);

  const processFile = useCallback((f) => {
    setError('');
    if (!validateFile(f)) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, [validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleSelect = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
  };

  const handleUpload = async () => {
    if (!file || !taskId) return;
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', taskId);
    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success(`${file.name} uploaded successfully`);
      if (onSuccess) setTimeout(onSuccess, 500);
      if (onClose) setTimeout(onClose, 500);
    } catch {
      toast.error('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const resetFile = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const ext = file ? file.name.split('.').pop().toLowerCase() : '';
  const isImage = file && file.type.startsWith('image/');

  return (
    <div className="space-y-4">
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50/50'
                : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              onChange={handleSelect}
              className="hidden"
            />
            <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
              dragOver ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {dragOver ? 'Drop file here' : 'Drag & drop file here'}
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">PDF, DOCX, PNG, JPG &mdash; Max 10MB</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-start gap-3">
              {isImage && preview ? (
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${getFileColor(ext)}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={getFileIcon(ext)} />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getFileColor(ext)}`}>
                        {getFileTypeLabel(ext)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      onClick={resetFile}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {uploading && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={!file || uploading || !taskId}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading {progress}%
              </span>
            ) : (
              'Upload'
            )}
          </button>
        </div>
    </div>
  );
}

export default DocumentUpload;
