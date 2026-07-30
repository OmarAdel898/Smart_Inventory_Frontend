import { api } from './client';

export interface Warehouse {
  id: string;
  name: string;
  code?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseStockSummary {
  warehouseId: string;
  totalSkus: number;
  totalUnits: number;
  lowStockCount: number;
}

export const warehouseApi = {
  list: () => {
    return api.get<Warehouse[]>('/warehouses');
  },
  getById: (id: string) => {
    return api.get<Warehouse>(`/warehouses/${id}`);
  },
  stockSummary: (warehouseId: string) => {
    return api.get<WarehouseStockSummary>(`/warehouses/${warehouseId}/summary`);
  },
};
