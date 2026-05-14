import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Button from '../components/ui/Button';
import { getApprovals, updateApproval } from '../api/approvals';
import { APPROVAL_STATUS_CONFIG, CARD_NO_HOVER, MODAL_OVERLAY, MODAL_CONTENT, BTN_SECONDARY } from '../config/ui';

function Avatar({ email, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sizeClass} rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold ring-2 ring-white shrink-0`}>
      {email?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

function ApprovalRow({ approval, onAction }) {
  const status = APPROVAL_STATUS_CONFIG[approval.status] || APPROVAL_STATUS_CONFIG.pending;

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors hidden sm:table-row">
        <td className="px-6 py-4">
          <p className="text-sm font-semibold text-gray-900">{approval.title}</p>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Avatar email={approval.requested_by?.email} />
            <span className="text-sm text-gray-600">{approval.requested_by?.email}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${status.badge}`}>
            {status.label}
          </span>
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            Level {approval.current_level}
          </span>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm text-gray-500">{new Date(approval.created_at).toLocaleDateString()}</span>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/approvals/${approval.id}/history`}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              History
            </Link>
            {approval.status === 'pending' && (
              <>
                <Button variant="success" size="sm" onClick={() => onAction(approval.id, 'approve')}>
                  Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => onAction(approval.id, 'reject')}>
                  Reject
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAction(approval.id, 'hold')}>
                  Hold
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      <tr className="sm:hidden border-b border-gray-100">
        <td colSpan="6" className="px-4 py-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 flex-1">{approval.title}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${status.badge}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Avatar email={approval.requested_by?.email} />
              <span>{approval.requested_by?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                Level {approval.current_level}
              </span>
              <span className="text-gray-500">{new Date(approval.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
              <Link
                to={`/approvals/${approval.id}/history`}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                History
              </Link>
              {approval.status === 'pending' && (
                <>
                  <Button variant="success" size="sm" onClick={() => onAction(approval.id, 'approve')}>
                    Approve
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onAction(approval.id, 'reject')}>
                    Reject
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onAction(approval.id, 'hold')}>
                    Hold
                  </Button>
                </>
              )}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const data = await getApprovals();
        setApprovals(Array.isArray(data) ? data : (data?.items || []));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load approvals');
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, []);

  const handleActionClick = (approvalId, action) => {
    setActionModal({ approvalId, action });
    setComment('');
    setError(null);
  };

  const handleSubmitAction = async () => {
    const actionMap = { approve: 'approved', reject: 'rejected', hold: 'hold' };

    if (actionModal.action === 'reject' && !comment.trim()) {
      setError('Comment is required for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const backendAction = actionMap[actionModal.action] || actionModal.action;
      await updateApproval(actionModal.approvalId, backendAction, comment);
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === actionModal.approvalId
            ? { ...a, status: actionModal.action === 'hold' ? 'on_hold' : backendAction }
            : a
        )
      );
      setActionModal(null);
      setComment('');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to update approval');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage approval requests</p>
        </div>

        <div className={`${CARD_NO_HOVER} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-200 hidden sm:table-header-group">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Title</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Requested By</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Level</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Loading approvals...</p>
                      </div>
                    </td>
                  </tr>
                ) : approvals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">No approval requests</p>
                      <p className="text-xs text-gray-500 mt-1">New approvals will appear here</p>
                    </td>
                  </tr>
                ) : (
                  approvals.map((approval) => (
                    <ApprovalRow key={approval.id} approval={approval} onAction={handleActionClick} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {actionModal && (
        <div className={MODAL_OVERLAY}>
          <div className={MODAL_CONTENT}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                actionModal.action === 'approve' ? 'bg-green-100' :
                actionModal.action === 'reject' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {actionModal.action === 'approve' ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : actionModal.action === 'reject' ? (
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {actionModal.action === 'approve' ? 'Approve Request' :
                   actionModal.action === 'reject' ? 'Reject Request' :
                   'Hold Request'}
                </h3>
                <p className="text-sm text-gray-500">
                  {actionModal.action === 'reject' ? 'Reason required for rejection' : 'Add an optional comment'}
                </p>
              </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Type your comment..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none hover:border-gray-400 transition-colors"
              rows="3"
              required={actionModal.action === 'reject'}
            />

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 mt-5 justify-end">
              <button
                className={BTN_SECONDARY}
                onClick={() => { setActionModal(null); setError(null); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <Button
                variant={actionModal.action === 'approve' ? 'success' : actionModal.action === 'reject' ? 'danger' : 'secondary'}
                onClick={handleSubmitAction}
                loading={submitting}
                disabled={submitting || (actionModal.action === 'reject' && !comment.trim())}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Approvals;
