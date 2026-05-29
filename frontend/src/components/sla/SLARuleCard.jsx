import { FiClock, FiTarget } from 'react-icons/fi';
import { CARD_NO_HOVER } from '../../config/ui';

export default function SLARuleCard({ rule, onEdit, onToggle }) {
  return (
    <div className={CARD_NO_HOVER}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{rule.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
          </div>
          <button onClick={() => onToggle?.(rule.id, !rule.is_active)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.is_active ? 'bg-indigo-600' : 'bg-gray-300'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${rule.is_active ? 'translate-x-4.5' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><FiClock className="w-3.5 h-3.5" /> {rule.response_time}h response</span>
          <span className="flex items-center gap-1"><FiTarget className="w-3.5 h-3.5" /> {rule.resolution_time}h resolution</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rule.priority === 'high' ? 'bg-red-100 text-red-700' : rule.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
            {rule.priority}
          </span>
          <span className="text-xs text-gray-400">{rule.applies_to}</span>
        </div>
      </div>
      {onEdit && (
        <div className="border-t border-gray-100 px-5 py-3">
          <button onClick={() => onEdit(rule)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit Rule</button>
        </div>
      )}
    </div>
  );
}
