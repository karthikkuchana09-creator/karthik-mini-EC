import { useState } from 'react';
import { FiCheck, FiX, FiPause } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ApprovalActions({ approvalId, onAction, loading = false }) {
  const [comment, setComment] = useState('');
  const [activeAction, setActiveAction] = useState(null);

  async function handleAction(action) {
    setActiveAction(action);
    try {
      await onAction(approvalId, action, comment);
      toast.success(`Approval ${action} successfully`);
      setComment('');
    } catch {
      toast.error(`Failed to ${action} approval`);
    } finally {
      setActiveAction(null);
    }
  }

  const actions = [
    { key: 'approved', label: 'Approve', icon: FiCheck, className: 'btn-success' },
    { key: 'rejected', label: 'Reject', icon: FiX, className: 'btn-danger' },
    { key: 'on_hold', label: 'Hold', icon: FiPause, className: 'btn-secondary' },
  ];

  return (
    <div className="space-y-3">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)..."
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
      />
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => handleAction(action.key)}
            disabled={loading && activeAction === action.key}
            className={`${action.className} text-xs px-3 py-1.5`}
          >
            <action.icon className="w-3.5 h-3.5" />
            {loading && activeAction === action.key ? 'Processing...' : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
