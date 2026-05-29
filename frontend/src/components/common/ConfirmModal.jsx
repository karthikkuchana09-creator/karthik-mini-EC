import { useState, useEffect, useCallback } from 'react';
import { FiAlertTriangle, FiTrash2, FiX, FiInfo } from 'react-icons/fi';
import { MODAL_OVERLAY, MODAL_CONTENT } from '../../config/ui';

const iconMap = {
  danger: { Icon: FiTrash2, bg: 'bg-red-100', text: 'text-red-600', ring: 'focus:ring-red-500' },
  warning: { Icon: FiAlertTriangle, bg: 'bg-yellow-100', text: 'text-yellow-600', ring: 'focus:ring-yellow-500' },
  info: { Icon: FiInfo, bg: 'bg-blue-100', text: 'text-blue-600', ring: 'focus:ring-blue-500' },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  error,
  children,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && !loading) onClose();
    if (e.key === 'Enter' && !loading && onConfirm) {
      const active = document.activeElement;
      if (active?.tagName !== 'TEXTAREA' && active?.tagName !== 'INPUT') {
        onConfirm();
      }
    }
  }, [onClose, onConfirm, loading]);

  useEffect(() => {
    if (!shouldRender) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [shouldRender, handleKeyDown]);

  if (!shouldRender) return null;

  const { Icon, bg, text, ring } = iconMap[variant] || iconMap.warning;

  return (
    <div
      className={`${MODAL_OVERLAY} transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={loading ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className={`${MODAL_CONTENT} transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="confirm-modal-title" className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
            aria-label="Close modal"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-full ${bg} flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600">{message}</p>
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`${variant === 'danger' ? 'btn-danger' : variant === 'warning' ? 'btn-primary' : 'btn-primary'} ${ring}`}
            type="button"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
