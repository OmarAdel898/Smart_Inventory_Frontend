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
  create: (data: { name: string; location?: string; status?: 'active' | 'inactive' }) => {
    return api.post<WarehouseResponse>('/warehouses', data);
  },
  update: (id: string, data: { name?: string; location?: string; status?: 'active' | 'inactive' }) => {
    return api.patch<WarehouseResponse>(`/warehouses/${id}`, data);
  },
  remove: (id: string) => {
    return api.delete<void>(`/warehouses/${id}`);
  },
};
