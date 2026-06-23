import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import ApprovalCard from '../../components/approvals/ApprovalCard';
import ApprovalActions from '../../components/approvals/ApprovalActions';
import FilterBar from '../../components/common/FilterBar';
import { Modal } from '../../components/ui';
import { FiCheckCircle, FiRotateCcw } from 'react-icons/fi';
import * as approvalsApi from '../../api/approvals';

export default function Approvals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({});
  const [selectedApproval, setSelectedApproval] = useState(null);

  const { data: approvals, isLoading, error, refetch } = useQuery({
    queryKey: ['approvals', filters],
    queryFn: () => approvalsApi.getApprovals(filters),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, comment }) => approvalsApi.updateApproval(id, action, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setSelectedApproval(null);
    },
  });

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function handleFilterClear() {
    setFilters({});
  }

  const filterConfig = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'on_hold', label: 'On Hold' },
    ]},
  ];

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;

  const approvalList = Array.isArray(approvals) ? approvals : approvals?.items || [];

  return (
    <div className="page-container">
      <PageHeader
        title="Approvals"
        subtitle="Review and manage approval requests"
        actions={
          <button
            onClick={() => navigate('/approvals/history')}
            className="btn-secondary"
          >
            <FiRotateCcw className="w-4 h-4" /> History
          </button>
        }
      />

      <div className="mb-6">
        <FilterBar filters={filterConfig} values={filters} onChange={handleFilterChange} onClear={handleFilterClear} />
      </div>

      {approvalList.length === 0 ? (
        <EmptyState
          icon={FiCheckCircle}
          title="No approvals"
          message="No approval requests match your criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approvalList.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onClick={() => setSelectedApproval(approval)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedApproval} onClose={() => setSelectedApproval(null)} title={selectedApproval?.title || 'Approval Details'} size="lg">
        {selectedApproval && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selectedApproval.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Requested by: {selectedApproval.requested_by?.name || 'Unknown'}</span>
              <span>Created: {selectedApproval.created_at ? new Date(selectedApproval.created_at).toLocaleString() : '-'}</span>
            </div>
            <ApprovalActions
              approvalId={selectedApproval.id}
              onAction={async (id, action, comment) => {
                await actionMutation.mutateAsync({ id, action, comment });
                toast.success(`Approval ${action}`);
              }}
              loading={actionMutation.isPending}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
