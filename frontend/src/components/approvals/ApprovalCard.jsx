import { FiClock, FiUser } from 'react-icons/fi';
import StatusBadge from '../common/StatusBadge';

export default function ApprovalCard({ approval, onClick }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-5 cursor-pointer" onClick={() => onClick?.(approval)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{approval.title || `Approval #${approval.id}`}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{approval.description}</p>
        </div>
        <StatusBadge status={approval.status} type="approval" />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1"><FiUser className="w-3.5 h-3.5" /> {approval.requested_by?.name || 'Unknown'}</span>
        <span className="flex items-center gap-1"><FiClock className="w-3.5 h-3.5" /> {approval.created_at ? new Date(approval.created_at).toLocaleDateString() : '-'}</span>
      </div>
      {approval.priority && (
        <div className="mt-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${approval.priority === 'high' ? 'bg-red-100 text-red-700' : approval.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
            {approval.priority}
          </span>
        </div>
      )}
    </div>
  );
}
