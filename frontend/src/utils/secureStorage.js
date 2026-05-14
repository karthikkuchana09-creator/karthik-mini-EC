const STORAGE_PREFIX = 'karthik_ec_';

export const storage = {
  get(key) {
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
    }
  },

  remove(key) {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear() {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => sessionStorage.removeItem(k));
  },

  getToken() {
    return storage.get('access_token');
  },

  setToken(token) {
    storage.set('access_token', token);
  },

  getRefreshToken() {
    return storage.get('refresh_token');
  },

  setRefreshToken(token) {
    storage.set('refresh_token', token);
  },

  getUser() {
    return storage.get('user');
  },

  setUser(user) {
    storage.set('user', user);
  },

  clearAuth() {
    storage.remove('access_token');
    storage.remove('refresh_token');
    storage.remove('user');
  },
};
