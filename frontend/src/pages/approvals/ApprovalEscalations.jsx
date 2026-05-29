import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { Modal } from '../../components/ui';
import {
  FiArrowUpCircle, FiCheckCircle, FiXCircle, FiPlus,
} from 'react-icons/fi';
import { BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, INPUT_CLASSES, INPUT_ERROR_CLASSES } from '../../config/ui';
import * as approvalsApi from '../../api/approvals';

const ESCALATION_STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'cancelled', label: 'Cancelled' },
];

const initialFormState = {
  approval_id: '',
  escalated_to: '',
  reason: '',
  level: 1,
};

export default function ApprovalEscalations() {
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState('all');
  const [filters, setFilters] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [resolveTarget, setResolveTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['approval-escalations'],
    queryFn: () => approvalsApi.getEscalations(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => approvalsApi.createEscalation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-escalations'] });
      toast.success('Escalation created successfully');
      closeForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to create escalation');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => approvalsApi.resolveEscalation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-escalations'] });
      toast.success('Escalation resolved successfully');
      setResolveTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to resolve escalation');
      setResolveTarget(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => approvalsApi.cancelEscalation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-escalations'] });
      toast.success('Escalation cancelled successfully');
      setCancelTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to cancel escalation');
      setCancelTarget(null);
    },
  });

  const list = useMemo(() => {
    const raw = Array.isArray(data) ? data : data?.items || [];
    return raw.filter((e) => {
      if (statusTab !== 'all' && e.status !== statusTab) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.level && String(e.level) !== filters.level) return false;
      return true;
    });
  }, [data, statusTab, filters]);

  const filterConfig = [
    {
      key: 'status', label: 'Status', type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'level', label: 'Level', type: 'select',
      options: [
        { value: '1', label: 'Level 1' },
        { value: '2', label: 'Level 2' },
        { value: '3', label: 'Level 3' },
      ],
    },
  ];

  const columns = useMemo(() => [
    {
      Header: 'Escalation ID',
      accessor: 'id',
      sortable: true,
      Cell: ({ value }) => <span className="font-mono text-xs text-gray-500">#{value}</span>,
    },
    {
      Header: 'Approval ID',
      accessor: 'approval_id',
      sortable: true,
      Cell: ({ value }) => <span className="font-mono text-xs text-indigo-600 font-medium">#{value}</span>,
    },
    {
      Header: 'Escalated From',
      accessor: 'escalated_from',
      Cell: ({ value }) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return <span className="text-sm text-gray-700">{value.name || value}</span>;
      },
    },
    {
      Header: 'Escalated To',
      accessor: 'escalated_to',
      Cell: ({ value }) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return <span className="text-sm text-gray-700">{value.name || value}</span>;
      },
    },
    {
      Header: 'Reason',
      accessor: 'reason',
      Cell: ({ value }) => (
        <span className="text-sm text-gray-600 truncate max-w-[200px] block" title={value}>
          {value || '-'}
        </span>
      ),
    },
    {
      Header: 'Level',
      accessor: 'level',
      sortable: true,
      Cell: ({ value }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          L{value}
        </span>
      ),
    },
    {
      Header: 'Status',
      accessor: 'status',
      sortable: true,
      Cell: ({ value }) => {
        const style = ESCALATION_STATUS_STYLE[value] || 'bg-gray-100 text-gray-700 border-gray-200';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
            {value}
          </span>
        );
      },
    },
    {
      Header: 'Escalated At',
      accessor: 'created_at',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      disableSortBy: true,
      Cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="flex items-center gap-2">
            {status === 'pending' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setResolveTarget(row.original); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <FiCheckCircle className="w-3.5 h-3.5" /> Resolve
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCancelTarget(row.original); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <FiXCircle className="w-3.5 h-3.5" /> Cancel
                </button>
              </>
            )}
            {status === 'active' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setResolveTarget(row.original); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <FiCheckCircle className="w-3.5 h-3.5" /> Resolve
                </button>
              </>
            )}
            {(status === 'resolved' || status === 'cancelled') && (
              <span className="text-xs text-gray-400 italic">-</span>
            )}
          </div>
        );
      },
    },
  ], []);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function handleFilterClear() {
    setFilters({});
  }

  function openCreateForm() {
    setForm(initialFormState);
    setFormErrors({});
    setShowCreateForm(true);
  }

  function closeForm() {
    setShowCreateForm(false);
    setForm(initialFormState);
    setFormErrors({});
  }

  function validateForm() {
    const errors = {};
    if (!form.approval_id) errors.approval_id = 'Approval ID is required';
    if (!form.escalated_to) errors.escalated_to = 'Escalated to is required';
    if (!form.reason.trim()) errors.reason = 'Reason is required';
    if (!form.level || form.level < 1) errors.level = 'Level must be at least 1';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    createMutation.mutate({
      approval_id: Number(form.approval_id),
      escalated_to: form.escalated_to,
      reason: form.reason.trim(),
      level: Number(form.level),
    });
  }

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  return (
    <div className="page-container">
      <PageHeader
        title="Approval Escalations"
        subtitle="Manage escalated approval requests"
        actions={
          <button onClick={openCreateForm} className={BTN_PRIMARY}>
            <FiPlus className="w-4 h-4" /> Manual Escalation
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusTab(tab.key)}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    statusTab === tab.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-shrink-0">
              <FilterBar
                filters={filterConfig}
                values={filters}
                onChange={handleFilterChange}
                onClear={handleFilterClear}
              />
            </div>
          </div>
        </div>
        <div className="p-5">
          {list.length === 0 ? (
            <EmptyState
              icon={FiArrowUpCircle}
              title="No escalations"
              message={statusTab !== 'all' ? `No ${statusTab} escalations found.` : 'No approval requests have been escalated.'}
              action={
                <button onClick={openCreateForm} className={BTN_PRIMARY}>
                  <FiPlus className="w-4 h-4" /> Create Escalation
                </button>
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={list}
              sortable
              searchable
              paginated
              pageSize={10}
              pageSizeOptions={[5, 10, 25, 50]}
              showPageSize
              emptyMessage="No escalations match your filters"
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateForm}
        onClose={closeForm}
        title="Manual Escalation"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div>
            <label htmlFor="approval_id" className="block text-sm font-medium text-gray-700 mb-1">
              Approval ID <span className="text-red-500">*</span>
            </label>
            <input
              id="approval_id"
              type="number"
              min="1"
              value={form.approval_id}
              onChange={(e) => setForm((prev) => ({ ...prev, approval_id: e.target.value }))}
              className={formErrors.approval_id ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
              placeholder="e.g., 42"
            />
            {formErrors.approval_id && <p className="mt-1 text-xs text-red-600">{formErrors.approval_id}</p>}
          </div>

          <div>
            <label htmlFor="escalated_to" className="block text-sm font-medium text-gray-700 mb-1">
              Escalated To <span className="text-red-500">*</span>
            </label>
            <input
              id="escalated_to"
              type="text"
              value={form.escalated_to}
              onChange={(e) => setForm((prev) => ({ ...prev, escalated_to: e.target.value }))}
              className={formErrors.escalated_to ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
              placeholder="User ID or email"
            />
            {formErrors.escalated_to && <p className="mt-1 text-xs text-red-600">{formErrors.escalated_to}</p>}
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              className={formErrors.reason ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
              placeholder="Explain why this approval needs escalation..."
            />
            {formErrors.reason && <p className="mt-1 text-xs text-red-600">{formErrors.reason}</p>}
          </div>

          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              id="level"
              value={form.level}
              onChange={(e) => setForm((prev) => ({ ...prev, level: Number(e.target.value) }))}
              className={formErrors.level ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
            >
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
            </select>
            {formErrors.level && <p className="mt-1 text-xs text-red-600">{formErrors.level}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={closeForm} disabled={createMutation.isPending} className={BTN_SECONDARY}>
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className={BTN_PRIMARY}>
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : 'Create Escalation'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        onConfirm={() => resolveMutation.mutate(resolveTarget.id)}
        title="Resolve Escalation"
        message={`Are you sure you want to resolve escalation #${resolveTarget?.id}${resolveTarget?.approval_id ? ` for approval #${resolveTarget.approval_id}` : ''}?`}
        confirmText="Resolve"
        variant="warning"
        loading={resolveMutation.isPending}
        error={resolveMutation.error ? (resolveMutation.error?.response?.data?.detail || 'Failed to resolve') : undefined}
      />

      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
        title="Cancel Escalation"
        message={`Are you sure you want to cancel escalation #${cancelTarget?.id}${cancelTarget?.approval_id ? ` for approval #${cancelTarget.approval_id}` : ''}? This action cannot be undone.`}
        confirmText="Cancel Escalation"
        variant="danger"
        loading={cancelMutation.isPending}
        error={cancelMutation.error ? (cancelMutation.error?.response?.data?.detail || 'Failed to cancel') : undefined}
      />
    </div>
  );
}
