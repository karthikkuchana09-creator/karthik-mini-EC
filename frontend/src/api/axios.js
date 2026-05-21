import axios from 'axios';
import toast from 'react-hot-toast';

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

const TOKEN_KEY = 'karthik_ec_access_token';
const REFRESH_KEY = 'karthik_ec_refresh_token';

function getToken() {
  try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY)); } catch { return null; }
}
function setToken(t) {
  try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch {}
}
function getRefreshToken() {
  try { return JSON.parse(sessionStorage.getItem(REFRESH_KEY)); } catch { return null; }
}
function setRefreshToken(t) {
  try { sessionStorage.setItem(REFRESH_KEY, JSON.stringify(t)); } catch {}
}
function clearAuthTokens() {
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith('karthik_ec_')).forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

const API_URL = import.meta.env.VITE_API_URL || '';
console.log('[Axios] VITE_API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[Axios] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, { token: token?.slice(0, 20) + '...', params: config.params });
    return config;
  },
  (error) => Promise.reject(error)
);

let redirectInProgress = false;
let lastNetworkErrorToast = 0;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const rt = getRefreshToken();
        if (!rt) throw new Error('No refresh token');

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || ''}/auth/refresh`,
          { refresh_token: rt }
        );

        const { access_token, refresh_token: newRt } = response.data;

        if (access_token) setToken(access_token);
        if (newRt) setRefreshToken(newRt);

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthTokens();
        if (!redirectInProgress) {
          redirectInProgress = true;
          toast.error('Session expired. Please login again.');
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    }

    if (error.code === 'ECONNABORTED') {
      const now = Date.now();
      if (now - lastNetworkErrorToast > 10000) {
        lastNetworkErrorToast = now;
        toast.error('Request timed out. Please try again.');
      }
    }

    if (!error.response && error.message === 'Network Error') {
      const now = Date.now();
      if (now - lastNetworkErrorToast > 10000) {
        lastNetworkErrorToast = now;
        toast.error('Network error. Please check your connection.');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
