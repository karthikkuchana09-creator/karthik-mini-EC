import axios from 'axios';
import toast from 'react-hot-toast';
import { tokenService } from '../services/tokenService';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class AuthError extends ApiError {
  constructor(message = 'Authentication required', data) {
    super(message, 401, data);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied', data) {
    super(message, 403, data);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', data) {
    super(message, 422, data);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

const API_URL = import.meta.env.VITE_API_URL || '';

const IDEMPOTENT_METHODS = ['get', 'head', 'options'];
const MAX_RETRIES = 1;
const RETRY_DELAY = 1000;

let isRefreshing = false;
let failedQueue = [];
let redirectInProgress = false;
let lastToastTimestamps = { network: 0, timeout: 0 };

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

function classifyError(error) {
  if (error.code === 'ECONNABORTED') return new TimeoutError();
  if (!error.response && error.message === 'Network Error') return new NetworkError();
  if (!error.response) return new NetworkError(error.message);

  const { status, data } = error.response;
  const message = data?.detail || data?.message || error.message;

  if (status === 401) return new AuthError(message, data);
  if (status === 403) return new ForbiddenError(message, data);
  if (status === 422) return new ValidationError(message, data);
  return new ApiError(message, status, data);
}

function shouldRetry(method, status) {
  if (!IDEMPOTENT_METHODS.includes(method)) return false;
  return status === 408 || status === 429 || status >= 500;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cooldownToast(key, message, interval = 10000) {
  const now = Date.now();
  if (now - lastToastTimestamps[key] > interval) {
    lastToastTimestamps[key] = now;
    toast.error(message);
  }
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

function useMock() {
  return import.meta.env.VITE_MOCK_DATA === 'true' || sessionStorage.getItem('useMockData') === 'true';
}

api.interceptors.request.use(
  async (config) => {
    if (useMock()) {
      const { matchMock } = await import('../services/mockData');
      const method = config.method?.toLowerCase() || 'get';
      const url = config.url || '';
      const result = matchMock(method, url, config);
      if (result) {
        if (import.meta.env.DEV) console.log(`[MOCK] ${method.toUpperCase()} ${url}`);
        config.adapter = () => Promise.resolve({
          data: result.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
        return config;
      }
    }

    const token = tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        hasToken: !!token,
      });
    }

    return config;
  },
  (error) => Promise.reject(classifyError(error)),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest._isRetry) {
      return Promise.reject(classifyError(error));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(classifyError(err)));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const rt = tokenService.getRefreshToken();
        if (!rt) throw new Error('No refresh token');

        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refresh_token: rt },
          { timeout: 15000 },
        );

        const { access_token, refresh_token: newRt } = response.data;

        if (access_token) tokenService.setAccessToken(access_token);
        if (newRt) tokenService.setRefreshToken(newRt);

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenService.clearAuth();
        if (!redirectInProgress) {
          redirectInProgress = true;
          toast.error('Session expired. Please login again.');
          window.dispatchEvent(new CustomEvent('auth:logout'));
          setTimeout(() => { redirectInProgress = false; }, 3000);
        }
        return Promise.reject(classifyError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      cooldownToast('403', 'You do not have permission to perform this action');
    }

    if (shouldRetry(originalRequest.method, error.response?.status)) {
      if (originalRequest._retryCount === undefined) originalRequest._retryCount = 0;
      if (originalRequest._retryCount < MAX_RETRIES) {
        originalRequest._retryCount += 1;
        originalRequest._isRetry = true;
        await sleep(RETRY_DELAY * originalRequest._retryCount);
        return api(originalRequest);
      }
    }

    if (error.code === 'ECONNABORTED') {
      cooldownToast('timeout', 'Request timed out. Please try again.');
    }

    if (!error.response && error.message === 'Network Error') {
      cooldownToast('network', 'Network error. Please check your connection.');
    }

    return Promise.reject(classifyError(error));
  },
);

export function createCancelToken() {
  return axios.CancelToken.source();
}

export default api;
