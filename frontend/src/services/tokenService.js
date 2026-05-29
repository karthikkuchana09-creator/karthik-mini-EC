import { jwtDecode } from 'jwt-decode';

const PREFIX = 'karthik_ec_';

function storageGet(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

function storageRemove(key) {
  sessionStorage.removeItem(PREFIX + key);
}

function storageClearByPrefix() {
  const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => sessionStorage.removeItem(k));
}

export const tokenService = {
  getAccessToken() {
    return storageGet('access_token');
  },

  setAccessToken(token) {
    storageSet('access_token', token);
  },

  getRefreshToken() {
    return storageGet('refresh_token');
  },

  setRefreshToken(token) {
    storageSet('refresh_token', token);
  },

  getUser() {
    return storageGet('user');
  },

  setUser(user) {
    storageSet('user', user);
  },

  clearAuth() {
    storageRemove('access_token');
    storageRemove('refresh_token');
    storageRemove('user');
  },

  clearAll() {
    storageClearByPrefix();
  },

  decodeToken(token) {
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  },

  getTokenExpiry(token) {
    const decoded = this.decodeToken(token);
    return decoded?.exp || null;
  },

  isTokenExpired(token) {
    if (!token) return true;
    const exp = this.getTokenExpiry(token);
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  },

  getAutoLogoutDelay(token) {
    const exp = this.getTokenExpiry(token);
    if (!exp) return null;
    const remaining = (exp - Date.now() / 1000) * 1000;
    return Math.max(0, remaining - 30000);
  },
};
