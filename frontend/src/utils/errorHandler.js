export function getErrorMessage(error, fallback = 'An unexpected error occurred') {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  if (error.response?.data) {
    const data = error.response.data;
    return data.detail || data.message || data.error || JSON.stringify(data);
  }

  if (error.message) {
    if (error.message === 'Network Error') return 'Network error. Please check your connection.';
    if (error.code === 'ERR_NETWORK') return 'Unable to reach the server. Please try again.';
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    return error.message;
  }

  return fallback;
}

export function isAuthError(error) {
  return error?.response?.status === 401;
}

export function isNotFoundError(error) {
  return error?.response?.status === 404;
}

export function isForbiddenError(error) {
  return error?.response?.status === 403;
}

export function isValidationError(error) {
  return error?.response?.status === 422;
}

export function getStatus(error) {
  return error?.response?.status || 0;
}
