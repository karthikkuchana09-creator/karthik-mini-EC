import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { getApprovalHistory } from '../api/approvalHistory';
import Badge from '../components/ui/Badge';

const actionIcons = {
  approved: '✅',
  rejected: '❌',
  on_hold: '⏸️',
  submitted: '📤',
  created: '📝',
};

const avatarGradients = {
  approved: 'from-green-500 to-green-600',
  rejected: 'from-red-500 to-red-600',
  on_hold: 'from-gray-400 to-gray-500',
  submitted: 'from-blue-500 to-blue-600',
  created: 'from-indigo-500 to-indigo-600',
};

function TimelineItem({ entry, isLast }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradients[entry.action] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-lg shadow-md shrink-0`}>
          {actionIcons[entry.action] || '📋'}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-2" />}
      </div>

      <div className="flex-1 pb-8">
        <div className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <Badge
              status={entry.action}
              label={entry.action.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            />
            <span className="text-xs text-gray-500 font-medium">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="avatar-sm">
              {entry.user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">{entry.user?.email || 'Unknown'}</span>
          </div>

          {entry.comment && (
            <div className="bg-gray-50 rounded-lg px-4 py-2.5 mt-2 border border-gray-100">
              <p className="text-sm text-gray-700">{entry.comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalHistory() {
  const { id } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getApprovalHistory(id);
        setHistory(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load approval history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [id]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/approvals" className="btn-secondary text-sm mb-4 inline-flex items-center gap-1">
          <span>←</span> Back to Approvals
        </Link>

        <div className="mb-6">
          <h1 className="page-title">Approval History</h1>
          <p className="page-subtitle">Approval #{id}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">📜</div>
              <p className="text-gray-500 font-medium">No history available</p>
              <p className="text-sm text-gray-400 mt-1">Activity will be tracked here.</p>
            </div>
          ) : (
            history.map((entry, index) => (
              <TimelineItem key={entry.id || index} entry={entry} isLast={index === history.length - 1} />
            ))
          )}
        </div>
      </div>
  );
}

export default ApprovalHistory;
