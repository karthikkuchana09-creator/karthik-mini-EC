import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { FiPlus, FiCheckCircle, FiClock, FiXCircle, FiSend } from 'react-icons/fi';
import { BTN_PRIMARY, BTN_SECONDARY, MODAL_OVERLAY, MODAL_CONTENT, APPROVAL_STATUS_CONFIG } from '../../config/ui';
import * as approvalsApi from '../../api/approvals';
import { getApprovalHistory } from '../../api/approvalHistory';
import { useCreateApproval } from '../../services/useApprovalsQuery';

const actionIcons = {
  approved: '✅',
  rejected: '❌',
  on_hold: '⏸️',
  submitted: '📤',
  created: '📝',
};

const avatarGradients = {
  approved: 'from-green-500 to-green-600',
  rejected: 'from-red-500 to-red-600',
  on_hold: 'from-gray-400 to-gray-500',
  submitted: 'from-blue-500 to-blue-600',
  created: 'from-indigo-500 to-indigo-600',
};

function StatusCell({ value }) {
  const config = APPROVAL_STATUS_CONFIG[value] || APPROVAL_STATUS_CONFIG.pending;
  return <StatusBadge status={value} label={config.label} />;
}

function LevelCell({ value }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
      {value}
    </span>
  );
}

export default function EmployeeApprovals() {
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '' });
  const [formError, setFormError] = useState('');
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { data: approvals, isLoading, error, refetch } = useQuery({
    queryKey: ['my-approvals', filters],
    queryFn: () => approvalsApi.getApprovals(),
  });

  const createMutation = useCreateApproval();

  const approvalList = useMemo(() => {
    const raw = Array.isArray(approvals) ? approvals : approvals?.items || [];
    return raw.filter((a) => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!a.title?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [approvals, filters]);

  const filterConfig = [
    {
      key: 'status', label: 'Status', type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'on_hold', label: 'On Hold' },
      ],
    },
    { key: 'search', label: 'Search', type: 'text', placeholder: 'Search approvals...' },
  ];

  const columns = useMemo(() => [
    {
      Header: 'Title',
      accessor: 'title',
      sortable: true,
      Cell: ({ value, row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{value}</span>
          {row.original.description && (
            <span className="text-xs text-gray-400 truncate max-w-[250px]">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      Header: 'Status',
      accessor: 'status',
      sortable: true,
      Cell: ({ value }) => <StatusCell value={value} />,
    },
    {
      Header: 'Level',
      accessor: 'current_level',
      Cell: ({ value }) => <LevelCell value={value} />,
    },
    {
      Header: 'Created',
      accessor: 'created_at',
      sortable: true,
      Cell: ({ value }) => value ? new Date(value).toLocaleDateString() : <span className="text-gray-400">-</span>,
    },
    {
      Header: 'Actions',
      id: 'actions',
      Cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleViewHistory(row.original); }}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FiClock className="w-3.5 h-3.5 mr-1.5" />
          History
        </button>
      ),
    },
  ], []);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function handleFilterClear() {
    setFilters({});
  }

  function handleCreateSubmit() {
    if (!createForm.title.trim()) {
      setFormError('Title is required');
      return;
    }
    setFormError('');
    createMutation.mutate(
      { title: createForm.title.trim(), description: createForm.description.trim() || undefined },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setCreateForm({ title: '', description: '' });
          refetch();
        },
      }
    );
  }

  async function handleViewHistory(approval) {
    setHistoryTarget(approval);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const data = await getApprovalHistory(approval.id);
      setHistoryData(Array.isArray(data) ? data : []);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  return (
    <div className="page-container">
      <PageHeader
        title="My Approvals"
        subtitle="Submit and track your approval requests"
        actions={
          <button onClick={() => setShowCreateModal(true)} className={BTN_PRIMARY}>
            <FiPlus className="w-4 h-4" /> New Request
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

      {approvalList.length === 0 ? (
        <EmptyState
          icon={FiCheckCircle}
          title="No approvals found"
          message="You haven't submitted any approval requests yet."
          action={
            <button onClick={() => setShowCreateModal(true)} className={BTN_PRIMARY}>
              <FiPlus className="w-4 h-4" /> Submit Request
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <DataTable
            columns={columns}
            data={approvalList}
            sortable
            paginated
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            showPageSize
            emptyMessage="No approvals match your filters"
          />
        </div>
      )}

      {showCreateModal && (
        <div className={MODAL_OVERLAY}>
          <div className={MODAL_CONTENT}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <FiSend className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">New Approval Request</h3>
                <p className="text-sm text-gray-500">Submit a request for approval</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="What do you need approved?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Provide details about your request..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            )}
            {createMutation.isError && (
              <p className="mt-3 text-sm text-red-600">
                {createMutation.error?.response?.data?.detail || 'Failed to submit request'}
              </p>
            )}

            <div className="flex gap-3 mt-5 justify-end">
              <button
                className={BTN_SECONDARY}
                onClick={() => { setShowCreateModal(false); setCreateForm({ title: '', description: '' }); setFormError(''); }}
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={createMutation.isPending || !createForm.title.trim()}
                className={BTN_PRIMARY}
              >
                {createMutation.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" /> Submitting...</>
                ) : (
                  <><FiSend className="w-4 h-4" /> Submit</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyTarget && (
        <div className={MODAL_OVERLAY}>
          <div className="max-w-lg w-full bg-white rounded-xl shadow-modal p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Approval History</h3>
                <p className="text-sm text-gray-500">{historyTarget.title}</p>
              </div>
              <button
                onClick={() => { setHistoryTarget(null); setHistoryData(null); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !historyData || historyData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">No history available</p>
                <p className="text-sm text-gray-400 mt-1">Activity will be tracked here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyData.map((entry, index) => (
                  <div key={entry.id || index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradients[entry.action] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-sm shadow-md shrink-0`}>
                        {actionIcons[entry.action] || '📋'}
                      </div>
                      {index < historyData.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700 uppercase">
                            {entry.action.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          <span className="text-xs text-gray-400">
                            {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        {entry.comment && (
                          <p className="text-sm text-gray-600 mt-1">{entry.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                className={BTN_SECONDARY}
                onClick={() => { setHistoryTarget(null); setHistoryData(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}