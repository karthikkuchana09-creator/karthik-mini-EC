import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

function defaultIsEmpty(data) {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    if (data.results && Array.isArray(data.results)) return data.results.length === 0;
    if (data.data && Array.isArray(data.data)) return data.data.length === 0;
    return false;
  }
  return false;
}

export function useApiQuery({
  queryKey,
  queryFn,
  options = {},
  loadingComponent,
  errorComponent,
  emptyComponent,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  emptyAction,
  isEmpty = defaultIsEmpty,
  enabled = true,
}) {
  const queryResult = useQuery({
    queryKey,
    queryFn,
    enabled,
    ...options,
  });

  const { data, isLoading, isError, error, refetch, isFetched } = queryResult;

  const isDataEmpty = isFetched && !isLoading && !isError && isEmpty(data);

  function renderLoading(fullPage) {
    if (loadingComponent) return loadingComponent;
    return <LoadingSpinner fullPage={fullPage ?? true} />;
  }

  function renderError() {
    if (errorComponent) return errorComponent;
    return (
      <ErrorMessage
        message={error?.message || 'An unexpected error occurred'}
        onRetry={refetch}
        fullPage
        error={error}
      />
    );
  }

  function renderEmpty() {
    if (emptyComponent) return emptyComponent;
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle || 'No data'}
        message={emptyMessage || 'There is nothing to display yet.'}
        action={emptyAction}
      />
    );
  }

  function render(children) {
    if (isLoading) return renderLoading();
    if (isError) return renderError();
    if (isDataEmpty) return renderEmpty();
    if (typeof children === 'function') return children({ data, refetch, queryResult });
    return children;
  }

  return {
    ...queryResult,
    data,
    isLoading,
    isError,
    error,
    refetch,
    isEmpty: isDataEmpty,
    render,
    renderLoading,
    renderError,
    renderEmpty,
  };
}
