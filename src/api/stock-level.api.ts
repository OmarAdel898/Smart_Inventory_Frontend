import { api } from './client';
import type { ApiPaginatedResponse } from '../types';
import type {
  StockLevelResponse,
  StockLevelQueryParams,
  UpdateStockLevelRequest,
} from './inventory-types';

export const stockLevelApi = {
  list: (params?: StockLevelQueryParams) => {
    const query = new URLSearchParams();
    if (params) {
      if (params.page !== undefined) query.append('page', params.page.toString());
      if (params.limit !== undefined) query.append('limit', params.limit.toString());
      if (params.skuId !== undefined && params.skuId !== '') {
        query.append('skuId', params.skuId);
      }
      if (params.warehouseId !== undefined && params.warehouseId !== '') {
        query.append('warehouseId', params.warehouseId);
      }
    }
    const queryString = query.toString();
    const path = `/stock-levels${queryString ? `?${queryString}` : ''}`;
    return api.get<ApiPaginatedResponse<StockLevelResponse>>(path);
  },

  update: (warehouseId: string, id: string, data: UpdateStockLevelRequest) => {
    return api.patch<StockLevelResponse>(`/warehouses/${warehouseId}/stock-levels/${id}`, data);
  },
};
