import { FiBell, FiEdit2, FiToggleLeft, FiToggleRight, FiTrash2, FiMail, FiSmartphone } from 'react-icons/fi';

const EVENT_COLORS = {
  task_created: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  task_updated: 'bg-blue-100 text-blue-700 border-blue-200',
  task_completed: 'bg-green-100 text-green-700 border-green-200',
  approval_requested: 'bg-amber-100 text-amber-700 border-amber-200',
  approval_approved: 'bg-green-100 text-green-700 border-green-200',
  approval_rejected: 'bg-red-100 text-red-700 border-red-200',
  mention: 'bg-purple-100 text-purple-700 border-purple-200',
  document_uploaded: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  deadline_approaching: 'bg-orange-100 text-orange-700 border-orange-200',
  sla_breach: 'bg-red-100 text-red-700 border-red-200',
};

const CHANNEL_ICONS = {
  in_app: { icon: FiBell, label: 'In-App' },
  email: { icon: FiMail, label: 'Email' },
};

export default function NotificationRuleCard({ rule, onEdit, onToggleStatus, onDelete, isAdminOrManager }) {
  const isActive = rule.status === 'active';
  const channels = rule.channels || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isActive ? 'from-indigo-500 to-violet-500' : 'from-gray-400 to-gray-500'} flex items-center justify-center shadow-sm shrink-0`}>
            <FiBell className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{rule.name}</h3>
            {rule.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rule.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {rule.event && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${EVENT_COLORS[rule.event] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {rule.event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              )}
              {channels.map((ch) => {
                const chCfg = CHANNEL_ICONS[ch] || { icon: FiBell, label: ch };
                const ChIcon = chCfg.icon;
                return (
                  <span key={ch} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                    <ChIcon className="w-3 h-3" />
                    {chCfg.label}
                  </span>
                );
              })}
              {rule.condition && (
                <span className="text-[10px] text-gray-400 font-mono">{rule.condition}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdminOrManager && (
        <div className="flex items-center justify-end gap-1 px-4 py-2 bg-gray-50/50 border-t border-gray-100 rounded-b-xl">
          <button onClick={() => onEdit(rule)} className="btn-icon" title="Edit rule">
            <FiEdit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onToggleStatus(rule)} className="btn-icon" title={isActive ? 'Deactivate' : 'Activate'}>
            {isActive ? <FiToggleLeft className="w-3.5 h-3.5" /> : <FiToggleRight className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(rule)} className="btn-icon hover:!text-red-500" title="Delete rule">
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
