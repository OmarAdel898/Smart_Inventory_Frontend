const BASE_URL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || '';

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.meta?.message || json?.message || json?.error || `Request failed (${res.status})`);
  }
  return json as T;
}

export interface StockLevel {
  id: string;
  skuId: string;
  skuName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reorderThreshold: number;
  safetyStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  skuId: string;
  skuCode: string | null;
  skuName: string | null;
  warehouseId: string;
  reason: string;
  quantityChange: number;
  balanceAfter: number;
  performedByUserId: string | null;
  performedByAgent: string | null;
  note: string | null;
  createdAt: string;
}

export interface DashboardData {
  lowStockCount: number;
  lowStockItems: StockLevel[];
  totalStockItems: number;
  totalUnits: number;
  pendingPoCount: number;
  recentMovements: StockMovement[];
}

export async function fetchBranchDashboard(warehouseId: string): Promise<DashboardData> {
  const headers = authHeaders();

  const [lowStockRes, stockLevelsRes, poRes, movementsRes] = await Promise.all([
    fetch(`${BASE_URL}/warehouses/${warehouseId}/stock-levels/low-stock`, { headers }).then(handleResponse<{ success: boolean; data: StockLevel[] }>),
    fetch(`${BASE_URL}/warehouses/${warehouseId}/stock-levels?page=1&limit=1`, { headers }).then(handleResponse<{ success: boolean; data: StockLevel[]; meta: { total: number } }>),
    fetch(`${BASE_URL}/purchase-orders?page=1&limit=1`, { headers }).then(handleResponse<{ success: boolean; data: unknown[]; meta: { total: number } }>),
    fetch(`${BASE_URL}/inventory/stock-movements?warehouseId=${warehouseId}&limit=10`, { headers }).then(handleResponse<{ success: boolean; data: StockMovement[] }>),
  ]);

  const lowStockData = lowStockRes.data || [];
  const totalUnits = lowStockData.reduce((sum, item) => sum + item.quantity, 0);

  return {
    lowStockCount: lowStockData.length,
    lowStockItems: lowStockData,
    totalStockItems: stockLevelsRes.meta?.total || 0,
    totalUnits,
    pendingPoCount: poRes.meta?.total || 0,
    recentMovements: movementsRes.data || [],
  };
}
