import { createAuthHeaders, getAccessTokenFromCookie } from '@/lib/auth';

export const API_BASE = 'http://localhost:3000';

function isJsonResponse(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessTokenFromCookie();
  const headers: Record<string, string> = {
    ...(token ? createAuthHeaders(token) : {}),
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.meta?.message || body?.message || body?.error || `Request failed (${response.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  if (isJsonResponse(body) && body.success === true && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}

export async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const token = getAccessTokenFromCookie();
  const headers: Record<string, string> = token ? createAuthHeaders(token) : {};

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.meta?.message || body?.message || body?.error || `Request failed (${response.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  if (isJsonResponse(body) && body.success === true && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}
