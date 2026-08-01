import { api } from './client';
import type { WarehouseResponse } from '@/types';

export type Warehouse = WarehouseResponse;

export const warehouseApi = {
  list: () => {
    return api.get<WarehouseResponse[]>('/warehouses');
  },
  getById: (id: string) => {
    return api.get<WarehouseResponse>(`/warehouses/${id}`);
  },
};
