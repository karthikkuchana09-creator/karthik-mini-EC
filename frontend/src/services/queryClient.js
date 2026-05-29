import { QueryClient } from '@tanstack/react-query';
import { getErrorMessage, isValidationError } from '../utils/errorHandler';
import { toastMessages } from '../utils/toastMessages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        if (isValidationError(error)) {
          toastMessages.error.validation(error);
        } else {
          const message = getErrorMessage(error);
          toastMessages.error.default(message);
        }
      },
    },
  },
});

export default queryClient;
