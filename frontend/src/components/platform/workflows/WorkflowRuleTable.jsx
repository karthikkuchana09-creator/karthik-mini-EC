import { FiShield, FiTrash2 } from 'react-icons/fi';

const CONDITION_LABELS = {
  status_equals: 'Status Equals',
  status_changed: 'Status Changed',
  assignee_equals: 'Assignee Equals',
  priority_equals: 'Priority Equals',
  field_equals: 'Field Equals',
  date_before: 'Date Before',
  date_after: 'Date After',
};

const ACTION_LABELS = {
  send_email: 'Send Email',
  send_notification: 'Send Notification',
  update_field: 'Update Field',
  assign_user: 'Assign User',
  create_task: 'Create Task',
  webhook: 'Webhook',
  escalate: 'Escalate',
};

export default function WorkflowRuleTable({ rules, onDelete, isAdminOrManager }) {
  if (!rules || rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
          <FiShield className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">No rules defined</p>
        <p className="text-xs text-gray-400">Add rules to define conditions and actions for this workflow.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">#</th>
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Condition</th>
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rules.map((rule, idx) => (
            <tr key={rule.id || idx} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {CONDITION_LABELS[rule.condition_type] || rule.condition_type || '-'}
                </span>
                {rule.condition_value && (
                  <span className="text-[11px] text-gray-500 ml-1.5 font-mono">{rule.condition_value}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {ACTION_LABELS[rule.action_type] || rule.action_type || '-'}
                </span>
                {rule.action_config && (
                  <span className="text-[11px] text-gray-500 ml-1.5 truncate max-w-[160px] inline-block align-bottom">
                    {typeof rule.action_config === 'object' ? JSON.stringify(rule.action_config) : rule.action_config}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  rule.priority <= 1 ? 'bg-red-50 text-red-700' :
                  rule.priority === 2 ? 'bg-amber-50 text-amber-700' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  {rule.priority || '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {isAdminOrManager && (
                  <button onClick={() => onDelete(rule)} className="btn-icon hover:!text-red-500" title="Delete rule">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
