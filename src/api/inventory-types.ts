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

export interface StockLevelResponse {
  id: string;
  skuId: string;
  skuName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  safetyStock: number;
  reorderThreshold: number;
}

export interface WarehouseResponse {
  id: string;
  name: string;
  code?: string;
}
