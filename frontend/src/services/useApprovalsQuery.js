import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as approvalsApi from '../api/approvals';
import toast from 'react-hot-toast';

export const approvalKeys = {
  all: ['approvals'],
  list: (filters) => [...approvalKeys.all, 'list', filters],
  history: (id) => [...approvalKeys.all, 'history', id],
};

export function useApprovals(filters) {
  return useQuery({
    queryKey: approvalKeys.list(filters),
    queryFn: () => approvalsApi.getApprovals(filters),
  });
}

export function useApprovalHistory(id) {
  return useQuery({
    queryKey: approvalKeys.history(id),
    queryFn: () => approvalsApi.getApprovalHistory(id),
    enabled: !!id,
  });
}

export function useUpdateApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, comment }) => approvalsApi.updateApproval(id, status, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      toast.success('Approval updated successfully');
    },
  });
}
