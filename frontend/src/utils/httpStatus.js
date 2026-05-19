export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const STATUS_MESSAGES = {
  [HTTP_STATUS.UNAUTHORIZED]: 'Please login to continue',
  [HTTP_STATUS.FORBIDDEN]: 'You do not have permission to perform this action',
  [HTTP_STATUS.NOT_FOUND]: 'The requested resource was not found',
  [HTTP_STATUS.CONFLICT]: 'A conflict occurred with the current state',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later',
  [HTTP_STATUS.SERVER_ERROR]: 'Internal server error. Please try again',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
};

export function getStatusMessage(status) {
  return STATUS_MESSAGES[status] || 'An unexpected error occurred';
}
