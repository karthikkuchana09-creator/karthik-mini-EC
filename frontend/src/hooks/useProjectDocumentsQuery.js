import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectDocumentService } from '../services/projectDocumentService';
import toast from 'react-hot-toast';

export const projectDocsKeys = {
  all: ['project-documents'],
  project: (projectId) => [...projectDocsKeys.all, 'project', projectId],
};

export function useProjectDocuments(projectId, params) {
  return useQuery({
    queryKey: projectDocsKeys.project(projectId),
    queryFn: () => projectDocumentService.getProjectDocuments(projectId, params),
    enabled: !!projectId,
    select: (data) => (Array.isArray(data) ? data : data?.items || data?.results || []),
  });
}

export function useUploadProjectDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, formData, onProgress }) =>
      projectDocumentService.uploadProjectDocument(projectId, formData, onProgress),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectDocsKeys.project(projectId) });
      toast.success('Document uploaded');
    },
  });
}

export function useDeleteProjectDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, documentId }) =>
      projectDocumentService.deleteProjectDocument(projectId, documentId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectDocsKeys.project(projectId) });
      toast.success('Document deleted');
    },
  });
}
