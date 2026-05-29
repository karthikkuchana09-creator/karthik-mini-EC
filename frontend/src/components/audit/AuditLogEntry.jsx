import { FiUser, FiGlobe, FiMonitor } from 'react-icons/fi';

const actionColors = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  LOGIN: 'text-purple-600 bg-purple-50',
  VIEW: 'text-gray-600 bg-gray-50',
};

export default function AuditLogEntry({ entry }) {
  const color = actionColors[entry.action] || 'text-gray-600 bg-gray-50';

  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-gray-50 transition-colors rounded-lg">
      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${color}`}>
        {entry.action?.charAt(0)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{entry.action}</span>
          <span className="text-xs text-gray-500">{entry.entity_type} #{entry.entity_id}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>{entry.action}</span>
        </div>
        {entry.details && <p className="text-xs text-gray-500 mt-0.5 truncate">{typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details)}</p>}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1"><FiUser className="w-3 h-3" /> {entry.actor?.name || entry.actor_id || 'System'}</span>
          <span className="flex items-center gap-1"><FiGlobe className="w-3 h-3" /> {entry.ip_address || '-'}</span>
          {entry.user_agent && <span className="flex items-center gap-1"><FiMonitor className="w-3 h-3" /> {entry.user_agent.slice(0, 30)}...</span>}
        </div>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</span>
    </div>
  );
}
