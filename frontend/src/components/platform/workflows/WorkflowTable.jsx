import { useState } from 'react';
import { FiEdit2, FiShield, FiClock, FiToggleLeft, FiToggleRight, FiTrash2, FiPlay, FiGitBranch } from 'react-icons/fi';
import DataTable from '../../ui/DataTable';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { useRolePermissions } from '../../../hooks/useRolePermissions';

const ENTITY_LABELS = { TASK: 'Task', APPROVAL: 'Approval', PROJECT: 'Project', MEETING: 'Meeting' };
const ENTITY_COLORS = {
  TASK: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  APPROVAL: 'bg-blue-100 text-blue-700 border-blue-200',
  PROJECT: 'bg-purple-100 text-purple-700 border-purple-200',
  MEETING: 'bg-amber-100 text-amber-700 border-amber-200',
};

function EntityBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${ENTITY_COLORS[type] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {ENTITY_LABELS[type] || type}
    </span>
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      isActive
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-gray-100 text-gray-600 border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function WorkflowTable({ workflows, loading, onEdit, onManageRules, onViewExecutions, onToggleStatus, onDelete, onRefresh }) {
  const { isAdminOrManager } = useRolePermissions();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const columns = [
    { key: 'name', label: 'Workflow Name', sortable: true, render: (val, row) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shrink-0">
          <FiGitBranch className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{val}</p>
          {row.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-xs">{row.description}</p>}
        </div>
      </div>
    )},
    { key: 'entity_type', label: 'Type', sortable: true, render: (val) => <EntityBadge type={val} /> },
    { key: 'trigger_event', label: 'Trigger', sortable: true, render: (val) => val ? (
      <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
        {val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    ) : <span className="text-xs text-gray-400">—</span> },
    { key: 'status', label: 'Status', sortable: true, render: (val) => <StatusBadge status={val} /> },
    { key: 'created_at', label: 'Created', sortable: true, render: (val) => (
      <span className="text-sm text-gray-500">{new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
    )},
    { key: 'actions', label: 'Actions', sortable: false, render: (_, row) => (
      <div className="flex items-center gap-1">
        {isAdminOrManager && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onEdit(row); }} className="btn-icon" title="Edit workflow">
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onManageRules(row); }} className="btn-icon" title="Manage rules">
              <FiShield className="w-4 h-4" />
            </button>
          </>
        )}
        <button onClick={(e) => { e.stopPropagation(); onViewExecutions(row); }} className="btn-icon" title="View executions">
          <FiClock className="w-4 h-4" />
        </button>
        {isAdminOrManager && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onToggleStatus(row); }} className="btn-icon" title={row.status === 'active' ? 'Deactivate' : 'Activate'}>
              {row.status === 'active' ? <FiToggleLeft className="w-4 h-4" /> : <FiToggleRight className="w-4 h-4" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }} className="btn-icon hover:!text-red-500" title="Delete workflow">
              <FiTrash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={workflows}
        loading={loading}
        emptyTitle="No workflows found"
        emptyDescription="Create your first workflow to automate processes across your enterprise."
        emptyAction={isAdminOrManager ? (
          <span className="text-xs text-gray-400">Click "New Workflow" above to get started</span>
        ) : null}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => onDelete(deleteTarget).then(() => setDeleteTarget(null))}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will soft-delete the workflow and its associated rules.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
