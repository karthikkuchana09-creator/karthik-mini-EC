import { FiGitBranch, FiToggleLeft, FiToggleRight, FiEdit2, FiTrash2, FiPlay, FiClock, FiShield } from 'react-icons/fi';

const ENTITY_COLORS = {
  TASK: 'from-emerald-500 to-teal-500',
  APPROVAL: 'from-blue-500 to-indigo-500',
  PROJECT: 'from-purple-500 to-pink-500',
  MEETING: 'from-amber-500 to-orange-500',
};

const ENTITY_LABELS = { TASK: 'Task', APPROVAL: 'Approval', PROJECT: 'Project', MEETING: 'Meeting' };

export default function WorkflowCard({ workflow, onEdit, onManageRules, onViewExecutions, onToggleStatus, onDelete, isAdminOrManager }) {
  const gradient = ENTITY_COLORS[workflow.entity_type] || 'from-gray-500 to-gray-600';
  const isActive = workflow.status === 'active';

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
            <FiGitBranch className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                {ENTITY_LABELS[workflow.entity_type] || workflow.entity_type}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{workflow.name}</h3>
            {workflow.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          {workflow.trigger_event && (
            <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
              {workflow.trigger_event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">
            {new Date(workflow.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2.5 bg-gray-50/50 border-t border-gray-100 rounded-b-xl">
        {isAdminOrManager && (
          <>
            <button onClick={() => onEdit(workflow)} className="btn-icon" title="Edit workflow">
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onManageRules(workflow)} className="btn-icon" title="Manage rules">
              <FiShield className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button onClick={() => onViewExecutions(workflow)} className="btn-icon" title="View executions">
          <FiClock className="w-3.5 h-3.5" />
        </button>
        {isAdminOrManager && (
          <>
            <button onClick={() => onToggleStatus(workflow)} className="btn-icon" title={isActive ? 'Deactivate' : 'Activate'}>
              {isActive ? <FiToggleLeft className="w-3.5 h-3.5" /> : <FiToggleRight className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onDelete(workflow)} className="btn-icon hover:!text-red-500" title="Delete workflow">
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {!isAdminOrManager && (
          <button onClick={() => onViewExecutions(workflow)} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            <FiPlay className="w-3 h-3" />
            Run
          </button>
        )}
      </div>
    </div>
  );
}
