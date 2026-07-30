import { requestJson } from './_shared';

export interface WarehouseDetails {
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

export interface StockLevel {
  id: string;
  skuId: string;
  skuName: string;
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  reorderThreshold: number;
  safetyStock: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrderSummary {
  id: string;
  vendorId: string;
  vendorName?: string | null;
  status: string;
  lineItemCount?: number;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalSummary {
  id: string;
  agentRunId: string;
  agentType: string;
  stepNumber: number;
  status: string;
  reasoning?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  skuId: string;
  skuCode?: string | null;
  skuName?: string | null;
  warehouseId: string;
  reason: string;
  quantityChange: number;
  balanceAfter: number;
  performedByUserId?: string | null;
  performedByAgent?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface BranchDashboardSnapshot {
  warehouse: WarehouseDetails | null;
  lowStockItems: StockLevel[];
  stockLevels: StockLevel[];
  pendingPurchaseOrders: PurchaseOrderSummary[];
  pendingApprovals: ApprovalSummary[];
  recentMovements: StockMovement[];
  selectedSkuId: string | null;
}

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

function unwrapOne<T>(value: unknown): T | null {
  if (value && typeof value === 'object') {
    if ('data' in value) {
      return ((value as { data?: T }).data ?? null) as T | null;
    }
    return value as T;
  }
  return null;
}

export async function fetchBranchDashboardSnapshot(warehouseId: string): Promise<BranchDashboardSnapshot> {
  const [warehouse, lowStockItems, stockLevels, pendingPurchaseOrders, pendingApprovals] = await Promise.all([
    requestJson<unknown>(`/warehouses/${warehouseId}`),
    requestJson<unknown>(`/stock-levels/low-stock?warehouseId=${warehouseId}`),
    requestJson<unknown>(`/stock-levels?warehouseId=${warehouseId}`),
    requestJson<unknown>(`/purchase-orders?warehouseId=${warehouseId}&status=pending_approval`),
    requestJson<unknown>(`/approvals?status=pending`),
  ]);

  const normalizedStockLevels = unwrapList<StockLevel>(stockLevels);
  const normalizedLowStock = unwrapList<StockLevel>(lowStockItems);
  const normalizedPendingPOs = unwrapList<PurchaseOrderSummary>(pendingPurchaseOrders);
  const normalizedPendingApprovals = unwrapList<ApprovalSummary>(pendingApprovals);

  return {
    warehouse: unwrapOne<WarehouseDetails>(warehouse),
    lowStockItems: normalizedLowStock,
    stockLevels: normalizedStockLevels,
    pendingPurchaseOrders: normalizedPendingPOs,
    pendingApprovals: normalizedPendingApprovals,
    recentMovements: [],
    selectedSkuId: normalizedLowStock[0]?.skuId || normalizedStockLevels[0]?.skuId || null,
  };
}

export async function fetchRecentMovementsBySku(skuId: string): Promise<StockMovement[]> {
  const data = await requestJson<unknown>(`/inventory/stock-movements/sku/${skuId}`);
  return unwrapList<StockMovement>(data);
}
