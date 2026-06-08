import Modal from '../ui/Modal';
import { useState } from 'react';

export default function ArchiveConfirmModal({ isOpen, onClose, onConfirm, workspace, action }) {
  const [loading, setLoading] = useState(false);
  const isArchive = action === 'archive';

  if (!workspace) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(workspace);
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isArchive ? 'bg-red-100' : 'bg-emerald-100'
        }`}>
          {isArchive ? (
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isArchive ? 'Archive Workspace' : 'Restore Workspace'}
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          {isArchive
            ? 'This will archive the workspace and make it inaccessible to members.'
            : 'This will restore the workspace and make it accessible to members again.'}
        </p>
        <p className="text-xs font-medium text-gray-700 mb-6 bg-gray-50 rounded-lg px-3 py-2">
          &quot;{workspace.name}&quot;
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={onClose} disabled={loading} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={isArchive ? 'btn-danger' : 'btn-primary'}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isArchive ? 'Archiving...' : 'Restoring...'}
              </span>
            ) : (
              isArchive ? 'Archive' : 'Restore'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
