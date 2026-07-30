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

export interface CategoryResponse {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorResponse {
  id: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SkuResponse {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  cost: number;
  price: number;
  preferredVendorId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CsvImportError {
  row: number;
  skuCode?: string;
  message: string;
}

export interface CsvImportResult {
  successful: number;
  failed: number;
  errors?: CsvImportError[];
}
