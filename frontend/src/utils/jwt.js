import { jwtDecode } from 'jwt-decode';

export function decodeToken(token) {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function getTokenExpiry(token) {
  const decoded = decodeToken(token);
  return decoded?.exp || null;
}

export function isTokenExpired(token) {
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}
