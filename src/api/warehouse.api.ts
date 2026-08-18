import { api } from './client';
import type { WarehouseResponse } from '@/types';

export type Warehouse = WarehouseResponse;

export interface WarehouseSummary extends WarehouseResponse {
  units: number;
  stockValue: number;
  targetValue: number;
  coveragePct: number;
  skuCount: number;
  lowStockCount: number;
  openOrderCount: number;
  staffCount: number;
}

export const warehouseApi = {
  list: () => {
    return api.get<WarehouseResponse[]>('/warehouses');
  },
  summary: () => {
    return api.get<WarehouseSummary[]>('/warehouses/summary');
  },
  getById: (id: string) => {
    return api.get<WarehouseResponse>(`/warehouses/${id}`);
  },
  create: (data: { name: string; location?: string; status?: 'active' | 'inactive'; capacityUnits?: number }) => {
    return api.post<WarehouseResponse>('/warehouses', data);
  },
  update: (id: string, data: { name?: string; location?: string; status?: 'active' | 'inactive'; capacityUnits?: number | null }) => {
    return api.patch<WarehouseResponse>(`/warehouses/${id}`, data);
  },
  remove: (id: string) => {
    return api.delete<void>(`/warehouses/${id}`);
  },
};