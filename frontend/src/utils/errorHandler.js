import { AuthError, ForbiddenError, ValidationError, NetworkError, TimeoutError } from '../api/axios';

export function getErrorMessage(error, fallback = 'An unexpected error occurred') {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  if (error instanceof AuthError) {
    return error.message || 'Authentication required. Please login again.';
  }

  if (error instanceof ForbiddenError) {
    return error.message || 'You do not have permission to perform this action.';
  }

  if (error instanceof ValidationError) {
    const data = error.data;
    if (data?.detail) return data.detail;
    if (data && typeof data === 'object') {
      const first = Object.values(data).flat().filter(Boolean)[0];
      return first || 'Validation failed. Please check your input.';
    }
    return error.message || 'Validation failed.';
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error instanceof TimeoutError) {
    return 'Request timed out. Please try again.';
  }

  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    return data.detail || data.message || data.error || JSON.stringify(data);
  }

  if (error.message) {
    if (error.message === 'Network Error') return 'Network error. Please check your connection.';
    if (error.code === 'ERR_NETWORK') return 'Unable to reach the server. Please try again.';
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (error.code === 'ERR_CANCELED') return 'Request was cancelled.';
    return error.message;
  }

  return fallback;
}

export function getValidationErrors(error) {
  if (!(error instanceof ValidationError) && error?.response?.status !== 422) return null;
  const data = error.response?.data || error.data;
  if (!data) return null;
  if (data.detail && Array.isArray(data.detail)) {
    const errors = {};
    data.detail.forEach((err) => {
      const field = err.loc?.slice(1).join('.') || 'field';
      if (!errors[field]) errors[field] = [];
      errors[field].push(err.msg);
    });
    return errors;
  }
  if (data.detail && typeof data.detail === 'string') return { _general: [data.detail] };
  return data;
}

export function isAuthError(error) {
  return error instanceof AuthError || error?.response?.status === 401;
}

export function isForbiddenError(error) {
  return error instanceof ForbiddenError || error?.response?.status === 403;
}

export function isNotFoundError(error) {
  return error?.response?.status === 404;
}

export function isValidationError(error) {
  return error instanceof ValidationError || error?.response?.status === 422;
}

export function isNetworkError(error) {
  return error instanceof NetworkError || error?.message === 'Network Error' || error?.code === 'ERR_NETWORK';
}

export function isTimeoutError(error) {
  return error instanceof TimeoutError || error?.code === 'ECONNABORTED';
}

export function isCancelError(error) {
  return error?.code === 'ERR_CANCELED' || axios?.isCancel?.(error);
}

export function getErrorStatus(error) {
  if (error instanceof AuthError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof ValidationError) return 422;
  return error?.response?.status || 0;
}

export function getErrorTitle(error) {
  if (isAuthError(error)) return 'Authentication Error';
  if (isForbiddenError(error)) return 'Access Denied';
  if (isValidationError(error)) return 'Validation Error';
  if (isNetworkError(error)) return 'Network Error';
  if (isTimeoutError(error)) return 'Timeout';
  if (isNotFoundError(error)) return 'Not Found';
  return 'Error';
}
