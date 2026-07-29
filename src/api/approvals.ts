import type { Approval, PaginationMeta } from '@/pages/ApprovalQueue/types';
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

interface ApprovalsApiResponse {
  success: boolean;
  data: Approval[];
  meta: PaginationMeta;
}

export async function fetchApprovals(params: { agentType?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params.agentType) searchParams.set('agentType', params.agentType);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  const res = await fetch(`${BASE_URL}/approvals${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<ApprovalsApiResponse>(res);
}

function assertPermission(allowed: boolean, action: string): void {
  if (!allowed) {
    throw new Error(`Access denied: you do not have permission to ${action} approval requests.`);
  }
}

export async function approveApproval(id: string, body: { reviewedBy: string; editedPayload?: object }) {
  const user = useAuthStore.getState().user;
  const perms = getRolePermissions(user?.role || '');
  assertPermission(perms.includes('approvals.approve'), 'approve');

  const res = await fetch(`${BASE_URL}/approvals/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse<{ success: boolean; data: unknown }>(res);
}

export async function rejectApproval(id: string, body: { reviewedBy: string }) {
  const user = useAuthStore.getState().user;
  const perms = getRolePermissions(user?.role || '');
  assertPermission(perms.includes('approvals.reject'), 'reject');

  const res = await fetch(`${BASE_URL}/approvals/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse<{ success: boolean; data: unknown }>(res);
}
