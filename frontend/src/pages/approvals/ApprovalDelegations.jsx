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
import UserSelectDropdown from '../../components/common/UserSelectDropdown';
import { Modal } from '../../components/ui';
import { FiPlus, FiUsers, FiXCircle } from 'react-icons/fi';
import { BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, INPUT_CLASSES, INPUT_ERROR_CLASSES } from '../../config/ui';
import * as approvalsApi from '../../api/approvals';
import * as tasksApi from '../../api/tasks';

const DELEGATION_STATUS_STYLE = {
  active: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const STATUS_TABS = [
  { key: 'all', label: 'All Delegations' },
  { key: 'mine', label: 'My Delegations' },
  { key: 'active', label: 'Active' },
];

const initialFormState = {
  delegated_to: '',
  start_date: '',
  end_date: '',
  reason: '',
};

export default function ApprovalDelegations() {
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState('all');
  const [filters, setFilters] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data: delegations, isLoading, error, refetch } = useQuery({
    queryKey: ['approval-delegations', statusTab],
    queryFn: () => {
      if (statusTab === 'mine') return approvalsApi.getMyDelegations();
      if (statusTab === 'active') return approvalsApi.getActiveDelegations();
      return approvalsApi.getDelegations();
    },
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => tasksApi.getUsers(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => approvalsApi.createDelegation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-delegations'] });
      toast.success('Delegation created successfully');
      closeForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to create delegation');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => approvalsApi.cancelDelegation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-delegations'] });
      toast.success('Delegation cancelled successfully');
      setCancelTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to cancel delegation');
      setCancelTarget(null);
    },
  });

  const list = useMemo(() => {
    const raw = Array.isArray(delegations) ? delegations : delegations?.items || [];
    return raw.filter((d) => {
      if (filters.status && d.status !== filters.status) return false;
      return true;
    });
  }, [delegations, filters]);

  const users = useMemo(() => {
    const raw = Array.isArray(usersData) ? usersData : usersData?.items || usersData?.users || [];
    return raw.map((u) => ({
      id: u.id,
      name: u.name || u.email || `User ${u.id}`,
      email: u.email,
    }));
  }, [usersData]);

  const filterConfig = [
    {
      key: 'status', label: 'Status', type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'expired', label: 'Expired' },
      ],
    },
  ];

  const columns = useMemo(() => [
    {
      Header: 'Delegator',
      accessor: 'delegated_by',
      sortable: true,
      Cell: ({ value }) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return <span className="text-sm text-gray-700 font-medium">{value.name || value}</span>;
      },
    },
    {
      Header: 'Delegatee',
      accessor: 'delegated_to',
      sortable: true,
      Cell: ({ value }) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return <span className="text-sm text-gray-700 font-medium">{value.name || value}</span>;
      },
    },
    {
      Header: 'Start Date',
      accessor: 'start_date',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleDateString() : <span className="text-gray-400">-</span>,
    },
    {
      Header: 'End Date',
      accessor: 'end_date',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleDateString() : <span className="text-gray-400">-</span>,
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
      Header: 'Status',
      accessor: 'status',
      sortable: true,
      Cell: ({ value }) => {
        const style = DELEGATION_STATUS_STYLE[value] || 'bg-gray-100 text-gray-700 border-gray-200';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
            {value || 'active'}
          </span>
        );
      },
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      disableSortBy: true,
      Cell: ({ row }) => {
        const s = row.original.status || 'active';
        return (
          <div className="flex items-center gap-2">
            {s === 'active' && (
              <button
                onClick={(e) => { e.stopPropagation(); setCancelTarget(row.original); }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <FiXCircle className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
            {s !== 'active' && (
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
    if (!form.delegated_to) errors.delegated_to = 'Delegatee is required';
    if (!form.start_date) errors.start_date = 'Start date is required';
    if (!form.end_date) errors.end_date = 'End date is required';
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      errors.end_date = 'End date must be after start date';
    }
    if (!form.reason.trim()) errors.reason = 'Reason is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    createMutation.mutate({
      delegated_to: form.delegated_to,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason.trim(),
    });
  }

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  return (
    <div className="page-container">
      <PageHeader
        title="Approval Delegations"
        subtitle="Manage approval authority delegations"
        actions={
          <button onClick={openCreateForm} className={BTN_PRIMARY}>
            <FiPlus className="w-4 h-4" /> Create Delegation
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
              icon={FiUsers}
              title="No delegations"
              message={statusTab !== 'all' ? `No ${statusTab} delegations found.` : 'No approval delegations have been configured.'}
              action={
                <button onClick={openCreateForm} className={BTN_PRIMARY}>
                  <FiPlus className="w-4 h-4" /> Create Delegation
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
              emptyMessage="No delegations match your filters"
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateForm}
        onClose={closeForm}
        title="Create Delegation"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div>
            <label htmlFor="delegated_to" className="block text-sm font-medium text-gray-700 mb-1">
              Delegatee <span className="text-red-500">*</span>
            </label>
            <UserSelectDropdown
              users={users}
              value={form.delegated_to}
              onChange={(id) => setForm((prev) => ({ ...prev, delegated_to: id }))}
              placeholder="Select user to delegate authority to..."
              loading={usersLoading}
              error={formErrors.delegated_to}
              name="delegatee"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className={formErrors.start_date ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
              />
              {formErrors.start_date && <p className="mt-1 text-xs text-red-600">{formErrors.start_date}</p>}
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className={formErrors.end_date ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
              />
              {formErrors.end_date && <p className="mt-1 text-xs text-red-600">{formErrors.end_date}</p>}
            </div>
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
              placeholder="Explain why this delegation is needed..."
            />
            {formErrors.reason && <p className="mt-1 text-xs text-red-600">{formErrors.reason}</p>}
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
              ) : 'Create Delegation'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
        title="Cancel Delegation"
        message={`Are you sure you want to cancel this delegation${cancelTarget?.delegated_to?.name ? ` to ${cancelTarget.delegated_to.name}` : ''}? This action cannot be undone.`}
        confirmText="Cancel Delegation"
        variant="danger"
        loading={cancelMutation.isPending}
        error={cancelMutation.error ? (cancelMutation.error?.response?.data?.detail || 'Failed to cancel') : undefined}
      />
    </div>
  );
}
