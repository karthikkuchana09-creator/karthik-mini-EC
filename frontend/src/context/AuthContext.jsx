import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { tokenService } from '../services/tokenService';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenService.getUser());
  const [token, setToken] = useState(() => tokenService.getAccessToken());
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef(null);
  const navigate = useNavigate();

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    tokenService.clearAuth();
  }, []);

  const logout = useCallback((reason) => {
    clearAuth();
    if (reason) toast.error(reason);
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  const scheduleAutoLogout = useCallback((newToken) => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (!newToken) return;
    const delay = tokenService.getAutoLogoutDelay(newToken);
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
    tokenService.setUser(userData);
    tokenService.setAccessToken(accessToken);
    if (refreshToken) tokenService.setRefreshToken(refreshToken);
    scheduleAutoLogout(accessToken);
  }, [scheduleAutoLogout]);

  useEffect(() => {
    const currentToken = tokenService.getAccessToken();
    if (currentToken) {
      if (tokenService.isTokenExpired(currentToken)) {
        const rt = tokenService.getRefreshToken();
        if (rt && !tokenService.isTokenExpired(rt)) {
          axios.post(`${API_URL}/auth/refresh`, { refresh_token: rt })
            .then((res) => {
              const { access_token, refresh_token: newRt } = res.data;
              const storedUser = tokenService.getUser();
              login(storedUser, access_token, newRt || rt);
            })
            .catch(() => logout('Session expired. Please login again.'))
            .finally(() => setLoading(false));
        } else {
          logout('Session expired. Please login again.');
          setLoading(false);
        }
      } else {
        scheduleAutoLogout(currentToken);
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

  const isAuthenticated = !!token && !tokenService.isTokenExpired(token);

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
