export interface ApiResponse<T> {
  success?: boolean;
  data: T;
}

export interface ApiPaginatedMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ApiPaginatedResponse<T> {
  success?: boolean;
  data: T[];
  meta?: ApiPaginatedMeta;
}

export interface CsvImportError {
  row: number;
  skuCode?: string;
  message: string;
}

export interface CsvImportResult {
  totalRows?: number;
  successful: number;
  failed: number;
  errors?: CsvImportError[];
}

export interface SkuResponse {
  id: string;
  sku: string;
  name: string;
  cost: number;
  price: number;
  categoryId: string | null;
  preferredVendorId: string | null;
  category?: { id: string; name: string } | null;
  preferredVendor?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockLevelResponse {
  id: string;
  skuId: string;
  skuName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reorderThreshold: number;
  safetyStock: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorResponse {
  id: string;
  name: string;
  email?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseResponse {
  id: string;
  name: string;
  location?: string | null;
  status: string;
  tenantId?: string | null;
  isMain: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type Warehouse = WarehouseResponse;
