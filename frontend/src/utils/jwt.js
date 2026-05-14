import { jwtDecode } from 'jwt-decode';

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch {
    return true;
  }
}

export function getTokenExpiry(token) {
  if (!token) return 0;
  try {
    return jwtDecode(token).exp;
  } catch {
    return 0;
  }
}

export function getUserFromToken(token) {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}
