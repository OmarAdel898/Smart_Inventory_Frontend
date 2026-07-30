import { requestJson, requestMultipart } from './_shared';
import type { ApiPaginatedResponse, CsvImportResult, SkuResponse } from '@/types';

type SkuQueryParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  categoryId?: string;
};

function toQuery(params?: SkuQueryParams): string {
  const query = new URLSearchParams();
  if (!params) return '';
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params.search) query.set('search', params.search);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  return query.toString();
}

export const skuApi = {
  list: (params?: SkuQueryParams) => {
    const qs = toQuery(params);
    return requestJson<ApiPaginatedResponse<SkuResponse> | SkuResponse[]>(`/sku${qs ? `?${qs}` : ''}`);
  },
  create: (payload: Record<string, unknown>) => requestJson<SkuResponse>('/sku', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  update: (id: string, payload: Record<string, unknown>) => requestJson<SkuResponse>(`/sku/${id}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  delete: (id: string) => requestJson<{ success: boolean }>(`/sku/${id}`, { method: 'DELETE' }),
  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestMultipart<CsvImportResult>('/sku/import', formData);
  },
};
