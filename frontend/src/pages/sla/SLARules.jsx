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
import { Modal } from '../../components/ui';
import {
  FiPlus, FiEdit2, FiTrash2, FiTarget,
} from 'react-icons/fi';
import { BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, INPUT_CLASSES, INPUT_ERROR_CLASSES } from '../../config/ui';
import * as slaApi from '../../api/sla';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const PRIORITY_BADGE = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const initialFormState = {
  module: '',
  priority: 'medium',
  allowed_hours: '',
  escalation_enabled: false,
  escalation_after_hours: '',
  is_active: true,
};

export default function SLARules() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sla-rules'],
    queryFn: () => slaApi.getSlaRules(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => slaApi.createSlaRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules'] });
      toast.success('SLA rule created successfully');
      closeForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to create SLA rule');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => slaApi.updateSlaRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules'] });
      toast.success('SLA rule updated successfully');
      closeForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update SLA rule');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => slaApi.toggleSlaRule(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules'] });
      toast.success('SLA rule status updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update SLA rule status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => slaApi.deleteSlaRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules'] });
      toast.success('SLA rule deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete SLA rule');
      setDeleteConfirm(null);
    },
  });

  const rules = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.items || data?.rules || [];
    return list.filter((r) => {
      if (filters.module && r.module !== filters.module) return false;
      if (filters.priority && r.priority !== filters.priority) return false;
      return true;
    });
  }, [data, filters]);

  const moduleOptions = useMemo(() => {
    const raw = Array.isArray(data) ? data : data?.items || data?.rules || [];
    const modules = [...new Set(raw.map((r) => r.module).filter(Boolean))];
    return modules.map((m) => ({ value: m, label: m }));
  }, [data]);

  const filterConfig = [
    { key: 'module', label: 'Module', type: 'select', options: moduleOptions },
    { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
  ];

  const columns = useMemo(() => [
    {
      Header: 'Rule ID',
      accessor: 'id',
      sortable: true,
      Cell: ({ value }) => (
        <span className="font-mono text-xs text-gray-500">#{value}</span>
      ),
    },
    {
      Header: 'Module',
      accessor: 'module',
      sortable: true,
    },
    {
      Header: 'Priority',
      accessor: 'priority',
      sortable: true,
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[value] || 'bg-gray-100 text-gray-700'}`}>
          {value}
        </span>
      ),
    },
    {
      Header: 'Allowed Hours',
      accessor: 'allowed_hours',
      sortable: true,
      Cell: ({ value }) => <span className="font-medium">{value}h</span>,
    },
    {
      Header: 'Escalation Enabled',
      accessor: 'escalation_enabled',
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      Header: 'Escalation After',
      accessor: 'escalation_after_hours',
      Cell: ({ value, row }) => (
        <span className="text-gray-600">
          {row.original.escalation_enabled && value != null ? `${value}h` : '-'}
        </span>
      ),
    },
    {
      Header: 'Status',
      accessor: 'is_active',
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {value ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      disableSortBy: true,
      Cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit rule"
            aria-label={`Edit rule #${row.original.id}`}
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: row.original.id, active: !row.original.is_active }); }}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title={row.original.is_active ? 'Disable rule' : 'Enable rule'}
            aria-label={row.original.is_active ? `Disable rule #${row.original.id}` : `Enable rule #${row.original.id}`}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row.original); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete rule"
            aria-label={`Delete rule #${row.original.id}`}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [toggleMutation]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function handleFilterClear() {
    setFilters({});
  }

  function openCreateForm() {
    setEditingRule(null);
    setForm(initialFormState);
    setFormErrors({});
    setShowForm(true);
  }

  function handleEdit(rule) {
    setEditingRule(rule);
    setForm({
      module: rule.module || '',
      priority: rule.priority || 'medium',
      allowed_hours: rule.allowed_hours ?? '',
      escalation_enabled: rule.escalation_enabled ?? false,
      escalation_after_hours: rule.escalation_after_hours ?? '',
      is_active: rule.is_active ?? true,
    });
    setFormErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingRule(null);
    setForm(initialFormState);
    setFormErrors({});
  }

  function validateForm() {
    const errors = {};
    if (!form.module.trim()) errors.module = 'Module name is required';
    if (!form.priority) errors.priority = 'Priority is required';
    if (!form.allowed_hours || Number(form.allowed_hours) <= 0) errors.allowed_hours = 'Must be greater than 0';
    if (form.escalation_enabled && (!form.escalation_after_hours || Number(form.escalation_after_hours) <= 0)) {
      errors.escalation_after_hours = 'Must be greater than 0 when escalation is enabled';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      module: form.module.trim(),
      priority: form.priority,
      allowed_hours: Number(form.allowed_hours),
      escalation_enabled: form.escalation_enabled,
      is_active: form.is_active,
    };

    if (form.escalation_enabled) {
      payload.escalation_after_hours = Number(form.escalation_after_hours);
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  return (
    <div className="page-container">
      <PageHeader
        title="SLA Rules"
        subtitle="Define and manage service level agreement rules"
        actions={
          <button onClick={openCreateForm} className={BTN_PRIMARY}>
            <FiPlus className="w-4 h-4" /> New Rule
          </button>
        }
      />

      <div className="mb-6">
        <FilterBar
          filters={filterConfig}
          values={filters}
          onChange={handleFilterChange}
          onClear={handleFilterClear}
        />
      </div>

      {rules.length === 0 && Object.keys(filters).length === 0 ? (
        <EmptyState
          icon={FiTarget}
          title="No SLA rules"
          message="Create your first SLA rule to start tracking service levels."
          action={
            <button onClick={openCreateForm} className={BTN_PRIMARY}>
              <FiPlus className="w-4 h-4" /> Create Rule
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={rules}
          sortable
          searchable
          paginated
          pageSize={10}
          pageSizeOptions={[5, 10, 25, 50]}
          showPageSize
          emptyMessage="No SLA rules match your filters"
          emptyTitle="No results"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
        />
      )}

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingRule ? 'Edit SLA Rule' : 'Create SLA Rule'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="module" className="block text-sm font-medium text-gray-700 mb-1">
              Module Name <span className="text-red-500">*</span>
            </label>
            <input
              id="module"
              type="text"
              value={form.module}
              onChange={(e) => setForm((prev) => ({ ...prev, module: e.target.value }))}
              className={formErrors.module ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
              placeholder="e.g., Support Ticket, Bug Report"
            />
            {formErrors.module && <p className="mt-1 text-xs text-red-600">{formErrors.module}</p>}
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              className={formErrors.priority ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {formErrors.priority && <p className="mt-1 text-xs text-red-600">{formErrors.priority}</p>}
          </div>

          <div>
            <label htmlFor="allowed_hours" className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Hours <span className="text-red-500">*</span>
            </label>
            <input
              id="allowed_hours"
              type="number"
              min="1"
              step="0.5"
              value={form.allowed_hours}
              onChange={(e) => setForm((prev) => ({ ...prev, allowed_hours: e.target.value }))}
              className={formErrors.allowed_hours ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
              placeholder="e.g., 24"
            />
            {formErrors.allowed_hours && <p className="mt-1 text-xs text-red-600">{formErrors.allowed_hours}</p>}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="escalation_enabled"
              type="checkbox"
              checked={form.escalation_enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, escalation_enabled: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="escalation_enabled" className="text-sm font-medium text-gray-700">
              Enable Escalation
            </label>
          </div>

          {form.escalation_enabled && (
            <div>
              <label htmlFor="escalation_after_hours" className="block text-sm font-medium text-gray-700 mb-1">
                Escalation After Hours <span className="text-red-500">*</span>
              </label>
              <input
                id="escalation_after_hours"
                type="number"
                min="1"
                step="0.5"
                value={form.escalation_after_hours}
                onChange={(e) => setForm((prev) => ({ ...prev, escalation_after_hours: e.target.value }))}
                className={formErrors.escalation_after_hours ? INPUT_ERROR_CLASSES : INPUT_CLASSES}
                placeholder="e.g., 48"
              />
              {formErrors.escalation_after_hours && (
                <p className="mt-1 text-xs text-red-600">{formErrors.escalation_after_hours}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={closeForm} disabled={isSubmitting} className={BTN_SECONDARY}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={BTN_PRIMARY}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {editingRule ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingRule ? 'Update Rule' : 'Create Rule'
              )}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
        title="Delete SLA Rule"
        message={`Are you sure you want to delete SLA rule "${deleteConfirm?.module}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        error={deleteMutation.error ? (deleteMutation.error?.response?.data?.detail || 'Failed to delete') : undefined}
      />
    </div>
  );
}
