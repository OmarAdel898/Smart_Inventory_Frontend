import { requestJson } from './_shared';
import type { ApiPaginatedResponse, VendorResponse } from '@/types';

export const vendorApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return requestJson<ApiPaginatedResponse<VendorResponse> | VendorResponse[]>(`/vendors${qs ? `?${qs}` : ''}`);
  },
};
