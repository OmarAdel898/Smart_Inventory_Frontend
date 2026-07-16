const BASE_URL = import.meta.env.VITE_API_BASE || '';

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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const messages = data?.message;
    const message = Array.isArray(messages) ? messages[0] : messages || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};
