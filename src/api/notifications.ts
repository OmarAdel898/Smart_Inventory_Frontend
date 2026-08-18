import { handleUnauthorized } from '@/api/client';

const BASE_URL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || '';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type NotificationType =
  | 'approval.requested'
  | 'lowstock.detected'
  | 'po.received'
  | 'vendor.responded';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  severity: NotificationSeverity;
  userId: string | null;
  warehouseId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface NotificationsListResponse {
  success: boolean;
  data: Notification[];
  meta: PaginationMeta;
}

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
    if (res.status === 401) handleUnauthorized();
    const message = json?.meta?.message || json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  type?: NotificationType | string;
  isRead?: boolean;
  warehouseId?: string;
}): Promise<NotificationsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.type) searchParams.set('type', params.type);
  if (params?.isRead !== undefined) searchParams.set('isRead', String(params.isRead));
  if (params?.warehouseId) searchParams.set('warehouseId', params.warehouseId);
  const qs = searchParams.toString();

  const res = await fetch(`${BASE_URL}/notifications${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<NotificationsListResponse>(res);
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: authHeaders(),
  });
  const json = await handleResponse<{ success: boolean; data: { count: number } }>(res);
  return json?.data?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const json = await handleResponse<{ success: boolean; data: Notification }>(res);
  return json?.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const json = await handleResponse<{ success: boolean; data: { updated: number } }>(res);
  return json?.data?.updated ?? 0;
}
