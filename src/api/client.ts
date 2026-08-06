const BASE_URL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || '';

import { isTokenExpired } from '@/lib/auth';

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokenCookie(token: string): void {
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function removeTokenCookie(): void {
  document.cookie = 'token=; path=/; max-age=0';
}

/**
 * Clears the session and redirects to the login page when the API returns
 * 401 (expired or invalid token). No-op if already on the login page.
 */
export function handleUnauthorized(): void {
  removeTokenCookie();
  try {
    localStorage.removeItem('user');
  } catch {
    /* ignore */
  }
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    if (isTokenExpired(token)) {
      handleUnauthorized();
      throw new ApiError('Session expired', 401);
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const rawMessage = json?.meta?.message || json?.message || json?.error || `Request failed (${res.status})`;
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    throw new ApiError(message, res.status, json?.meta || json);
  }

  if (json?.success === true) return json.data as T;
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
