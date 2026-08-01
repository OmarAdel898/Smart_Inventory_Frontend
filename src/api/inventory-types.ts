// All types are now in the canonical @/types location.
// This file is kept for backward-compat imports from '@/api/inventory-types'.
export type {
  StockLevelResponse,
  WarehouseResponse,
} from '@/types';

export interface StockLevelQueryParams {
  page?: number;
  limit?: number;
  skuId?: string;
  warehouseId?: string;
}

export interface UpdateStockLevelRequest {
  reorderThreshold: number;
  safetyStock: number;
}
