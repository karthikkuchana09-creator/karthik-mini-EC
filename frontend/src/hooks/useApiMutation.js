import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toastMessages } from '../utils/toastMessages';
import { getErrorMessage } from '../utils/errorHandler';

export function useApiMutation({
  mutationFn,
  onSuccess,
  onError,
  invalidateKeys,
  successMessage,
  errorMessage,
  resourceName,
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onSuccess: (data, variables, context) => {
      if (invalidateKeys?.length) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });
      }

      if (successMessage) {
        if (typeof successMessage === 'function') {
          toastMessages.success.default(successMessage(data, variables));
        } else {
          toastMessages.success.default(successMessage);
        }
      }

      onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      if (errorMessage) {
        if (typeof errorMessage === 'function') {
          toastMessages.error.default(errorMessage(error, variables));
        } else {
          toastMessages.error.default(errorMessage || getErrorMessage(error));
        }
      } else if (resourceName) {
        toastMessages.error.apiError(error);
      } else {
        toastMessages.error.apiError(error);
      }

      onError?.(error, variables, context);
    },

    retry: false,
  });
}
