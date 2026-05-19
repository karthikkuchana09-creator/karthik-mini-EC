import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import toast from 'react-hot-toast';

export const usersKeys = {
  all: ['users'],
  list: (filters) => [...usersKeys.all, 'list', filters],
  detail: (id) => [...usersKeys.all, 'detail', id],
};

export function useUsers(filters) {
  return useQuery({
    queryKey: usersKeys.list(filters),
    queryFn: () => usersApi.getUsers(filters),
    select: (data) => Array.isArray(data) ? data : data?.users || data?.items || [],
  });
}

export function useUser(id) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersApi.getUser(id),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
      toast.success('User updated successfully');
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => usersApi.toggleUserActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}
