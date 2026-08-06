import { requestJson } from './_shared';
import type { ApiPaginatedResponse, VendorResponse } from '@/types';

export interface VendorPayload {
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export const vendorApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return requestJson<ApiPaginatedResponse<VendorResponse> | VendorResponse[]>(`/vendors${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => requestJson<VendorResponse>(`/vendors/${id}`),
  create: (payload: VendorPayload) =>
    requestJson<VendorResponse>(`/vendors`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }),
  update: (id: string, payload: Partial<VendorPayload>) =>
    requestJson<VendorResponse>(`/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }),
  remove: (id: string) =>
    requestJson<{ success: boolean }>(`/vendors/${id}`, { method: 'DELETE' }),
};
