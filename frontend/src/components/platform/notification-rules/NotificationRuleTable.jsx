import { useState } from 'react';
import { FiEdit2, FiToggleLeft, FiToggleRight, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import DataTable from '../../ui/DataTable';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { useRolePermissions } from '../../../hooks/useRolePermissions';

const EVENT_LABELS = {
  task_assignment: 'Task Assigned',
  task_status: 'Task Status',
  approval_request: 'Approval Pending',
  approval_action: 'Approval Action',
  meeting_reminder: 'Meeting Reminder',
  escalation_alert: 'Escalation',
  mention_alert: 'Mention',
  document_update: 'Document Update',
  comment: 'Comment',
  system_alert: 'System Alert',
  sla_breach: 'SLA Breach',
};

const EVENT_COLORS = {
  task_assignment: 'bg-blue-100 text-blue-700 border-blue-200',
  task_status: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  approval_request: 'bg-amber-100 text-amber-700 border-amber-200',
  approval_action: 'bg-orange-100 text-orange-700 border-orange-200',
  meeting_reminder: 'bg-purple-100 text-purple-700 border-purple-200',
  escalation_alert: 'bg-red-100 text-red-700 border-red-200',
  mention_alert: 'bg-pink-100 text-pink-700 border-pink-200',
  document_update: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  comment: 'bg-green-100 text-green-700 border-green-200',
  system_alert: 'bg-gray-100 text-gray-700 border-gray-200',
  sla_breach: 'bg-rose-100 text-rose-700 border-rose-200',
};

function EventBadge({ eventType }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${EVENT_COLORS[eventType] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {EVENT_LABELS[eventType] || eventType}
    </span>
  );
}

function ChannelBadge({ channel }) {
  if (channel === 'both') {
    return (
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200/60">
          In-App
        </span>
        <span className="text-gray-300 text-xs">+</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200/60">
          Email
        </span>
      </div>
    );
  }
  const isInApp = channel === 'in_app';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
      isInApp
        ? 'bg-indigo-50 text-indigo-600 border-indigo-200/60'
        : 'bg-amber-50 text-amber-600 border-amber-200/60'
    }`}>
      {isInApp ? 'In-App' : 'Email'}
    </span>
  );
}

function StatusBadge({ isActive }) {
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

export default function NotificationRuleTable({ rules, loading, onEdit, onToggleStatus, onDelete }) {
  const { isAdminOrManager } = useRolePermissions();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const columns = [
    { key: 'name', label: 'Rule Name', sortable: true, render: (val, row) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shrink-0">
          <FiMessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{val}</p>
          {row.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-xs">{row.description}</p>}
        </div>
      </div>
    )},
    { key: 'event_type', label: 'Event', sortable: true, render: (val) => <EventBadge eventType={val} /> },
    { key: 'channel', label: 'Notification Type', sortable: true, render: (val) => <ChannelBadge channel={val} /> },
    { key: 'is_active', label: 'Status', sortable: true, render: (val) => <StatusBadge isActive={val} /> },
    { key: 'created_at', label: 'Created', sortable: true, render: (val) => (
      <span className="text-sm text-gray-500">{new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
    )},
    { key: 'actions', label: 'Actions', sortable: false, render: (_, row) => (
      <div className="flex items-center gap-1">
        {isAdminOrManager && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onEdit(row); }} className="btn-icon" title="Edit rule">
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleStatus(row); }} className="btn-icon" title={row.is_active ? 'Deactivate' : 'Activate'}>
              {row.is_active ? <FiToggleLeft className="w-4 h-4" /> : <FiToggleRight className="w-4 h-4" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }} className="btn-icon hover:!text-red-500" title="Delete rule">
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
        data={rules}
        loading={loading}
        emptyTitle="No notification rules found"
        emptyDescription="Create your first rule to start receiving targeted notifications."
        emptyAction={isAdminOrManager ? (
          <span className="text-xs text-gray-400">Click "New Rule" above to get started</span>
        ) : null}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => onDelete(deleteTarget).then(() => setDeleteTarget(null))}
        title="Delete Notification Rule"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will soft-delete the rule.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
