export interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  warehouseId?: string;
  warehouse_id?: string;
  warehouse?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  [key: string]: unknown;
}

const TOKEN_COOKIE_NAME = 'token';
const TOKEN_COOKIE_PATTERN = /(?:^|;\s*)token=([^;]*)/;

export function getAccessTokenFromCookie(): string | null {
  const match = document.cookie.match(TOKEN_COOKIE_PATTERN);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAccessTokenCookie(token: string): void {
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAccessTokenCookie(): void {
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
}

export function createAuthHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    return atob(padded);
  }

  throw new Error('Base64 decoding is not available in this environment.');
}

export function decodeJwtPayload<T extends JwtPayload = JwtPayload>(token: string): T | null {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

function getClaimAsString(payload: JwtPayload | null, keys: string[]): string | null {
  if (!payload) {
    return null;
  }

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

export function getRoleFromToken(tokenOrPayload: string | JwtPayload | null | undefined): string | null {
  if (!tokenOrPayload) {
    return null;
  }

  const payload = typeof tokenOrPayload === 'string' ? decodeJwtPayload(tokenOrPayload) : tokenOrPayload;
  return getClaimAsString(payload, ['role', 'userRole', 'roles']);
}

export function getWarehouseIdFromToken(tokenOrPayload: string | JwtPayload | null | undefined): string | null {
  if (!tokenOrPayload) {
    return null;
  }

  const payload = typeof tokenOrPayload === 'string' ? decodeJwtPayload(tokenOrPayload) : tokenOrPayload;
  return getClaimAsString(payload, ['warehouseId', 'warehouse_id', 'warehouse']);
}

export function isTokenExpired(tokenOrPayload: string | JwtPayload | null | undefined): boolean {
  if (!tokenOrPayload) {
    return true;
  }

  const payload = typeof tokenOrPayload === 'string' ? decodeJwtPayload(tokenOrPayload) : tokenOrPayload;
  if (!payload?.exp) {
    return false;
  }

  return Date.now() >= payload.exp * 1000;
}
