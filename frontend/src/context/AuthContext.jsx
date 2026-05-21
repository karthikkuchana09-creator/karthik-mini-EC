import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { storage } from '../utils/secureStorage';
import { isTokenExpired, getTokenExpiry } from '../utils/jwt';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || '';

function getAutoLogoutDelay(token) {
  const exp = getTokenExpiry(token);
  if (!exp) return null;
  const now = Math.floor(Date.now() / 1000);
  const remaining = (exp - now) * 1000;
  return Math.max(0, remaining - 30000);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getUser());
  const [token, setToken] = useState(() => storage.getToken());
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef(null);
  const navigate = useNavigate();

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    storage.clearAuth();
  }, []);

  const logout = useCallback((reason) => {
    clearAuth();
    if (reason) toast.error(reason);
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  const scheduleAutoLogout = useCallback((newToken) => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (!newToken) return;
    const delay = getAutoLogoutDelay(newToken);
    if (delay === null || delay <= 0) {
      logout('Session expired. Please login again.');
      return;
    }
    logoutTimerRef.current = setTimeout(() => {
      logout('Session expired. Please login again.');
    }, delay);
  }, [logout]);

  const login = useCallback((userData, accessToken, refreshToken) => {
    setUser(userData);
    setToken(accessToken);
    storage.setUser(userData);
    storage.setToken(accessToken);
    if (refreshToken) storage.setRefreshToken(refreshToken);
    scheduleAutoLogout(accessToken);
  }, [scheduleAutoLogout]);

  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        const rt = storage.getRefreshToken();
        if (rt && !isTokenExpired(rt)) {
          axios.post(`${API_URL}/auth/refresh`, { refresh_token: rt })
            .then((res) => {
              const { access_token, refresh_token: newRt } = res.data;
              login(storage.getUser(), access_token, newRt || rt);
            })
            .catch(() => logout('Session expired. Please login again.'))
            .finally(() => setLoading(false));
        } else {
          logout('Session expired. Please login again.');
          setLoading(false);
        }
      } else {
        scheduleAutoLogout(token);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleForceLogout = () => {
      clearAuth();
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [clearAuth, navigate]);

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, []);

  const isAuthenticated = !!token && !isTokenExpired(token);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      login,
      logout,
      clearAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
