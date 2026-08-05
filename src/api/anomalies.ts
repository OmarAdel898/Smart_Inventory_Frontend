import { useAuthStore } from '@/store/authStore';
import { getRolePermissions } from '@/config/permissions';

const BASE_URL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || '';

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.meta?.message || json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export interface AnomalyFlag {
  id: string;
  skuId: string;
  type: string; // e.g. 'critical', 'warning', 'shrinkage'
  description: string;
  reasoning: string;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  relatedMovementIds: string[];
  createdAt: string;
  updatedAt: string;
  sku?: {
    id: string;
    sku: string;
    name: string;
  };
}

export async function fetchAnomalies(params?: { skuId?: string; status?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.skuId) searchParams.set('skuId', params.skuId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  const res = await fetch(`${BASE_URL}/anomalies${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<{ success: boolean; data: AnomalyFlag[] }>(res);
}

function assertPermission(allowed: boolean, action: string): void {
  if (!allowed) {
    throw new Error(`Access denied: you do not have permission to ${action} anomalies.`);
  }
}

export async function reviewAnomaly(id: string, body: { resolutionNotes?: string } = {}) {
  const user = useAuthStore.getState().user;
  const perms = getRolePermissions(user?.role || '');
  assertPermission(perms.includes('anomalies.resolve'), 'resolve');

  const res = await fetch(`${BASE_URL}/anomalies/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse<{ success: boolean; data: AnomalyFlag }>(res);
}

export async function escalateAnomaly(id: string, body: { resolutionNotes?: string } = {}) {
  const user = useAuthStore.getState().user;
  const perms = getRolePermissions(user?.role || '');
  assertPermission(perms.includes('anomalies.resolve'), 'escalate');

  const res = await fetch(`${BASE_URL}/anomalies/${id}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse<{ success: boolean; data: AnomalyFlag }>(res);
}
