import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  Clock,
  FileDown,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LowStockItem {
  id: string;
  skuId: string;
  skuName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reorderThreshold: number;
  safetyStock: number;
}

interface Warehouse {
  id: string;
  name: string;
  code?: string;
}

interface StockMovement {
  id: string;
  skuId: string;
  warehouseId: string;
  reason: string;
  quantityChange: number;
  createdAt: string;
  skuName?: string;
  warehouseName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

function getToken(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function safeFetch<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const token = getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal,
    });
    if (!res.ok) return null;
    const body = await res.json() as { success?: boolean; data?: T } | T;
    if (typeof body === 'object' && body !== null && 'success' in body && (body as { success: boolean }).success) {
      return (body as { success: boolean; data: T }).data;
    }
    return body as T;
  } catch {
    return null;
  }
}

function formatDate(val: string) {
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

function getReasonColor(reason: string) {
  const r = reason.toUpperCase();
  if (r.includes('INBOUND') || r.includes('TRANSFER_IN')) return 'bg-emerald-100 text-emerald-800';
  if (r.includes('OUTBOUND') || r.includes('TRANSFER_OUT')) return 'bg-red-100 text-red-700';
  if (r.includes('TRANSFER')) return 'bg-blue-100 text-blue-700';
  return 'bg-surface-container text-on-surface-variant';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [pendingPoCount, setPendingPoCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [
      lowStockData,
      warehouseData,
      poData,
      approvalData,
      movementData,
    ] = await Promise.all([
      safeFetch<LowStockItem[]>(`${API_BASE}/stock-levels/low-stock`, signal),
      safeFetch<Warehouse[]>(`${API_BASE}/warehouses`, signal),
      safeFetch<{ data?: unknown[] } | unknown[]>(`${API_BASE}/purchase-orders?status=pending_approval&limit=100`, signal),
      safeFetch<{ data?: unknown[] } | unknown[]>(`${API_BASE}/approvals?status=pending&limit=100`, signal),
      safeFetch<StockMovement[]>(`${API_BASE}/inventory/stock-movements?limit=10`, signal),
    ]);

    setLowStock(Array.isArray(lowStockData) ? lowStockData : []);
    setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);

    // PO count — handle both paginated and array responses
    if (Array.isArray(poData)) {
      setPendingPoCount(poData.length);
    } else if (poData && typeof poData === 'object' && 'data' in poData && Array.isArray((poData as { data: unknown[] }).data)) {
      setPendingPoCount((poData as { data: unknown[] }).data.length);
    } else {
      setPendingPoCount(0);
    }

    // Approval count
    if (Array.isArray(approvalData)) {
      setApprovalCount(approvalData.length);
    } else if (approvalData && typeof approvalData === 'object' && 'data' in approvalData && Array.isArray((approvalData as { data: unknown[] }).data)) {
      setApprovalCount((approvalData as { data: unknown[] }).data.length);
    } else {
      setApprovalCount(0);
    }

    setMovements(Array.isArray(movementData) ? movementData : []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading system overview…</p>
      </div>
    );
  }

  // Compute bar chart data from warehouses (mock fill pct until API returns stock values)
  const barData = warehouses.slice(0, 5).map((wh, i) => ({
    name: wh.name,
    pct: Math.max(20, 100 - i * 13),   // will be replaced with real data when available
  }));

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-0.5">
            {user?.role ? user.role.replace(/_/g, ' ') : 'Logistics Command'}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface">System Overview</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Real-time status across all regional logistics hubs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-outline-variant"
          >
            <Clock className="h-3.5 w-3.5" />
            LAST 24 HOURS
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-primary text-white hover:bg-primary/90"
          >
            <FileDown className="h-3.5 w-3.5" />
            EXPORT REPORT
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void load(undefined, true)}
            disabled={refreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── 4 KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* KPI 1 – Low Stock Alerts */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 relative overflow-hidden group hover:border-red-300/60 transition-all shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500 rounded-t-xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            {lowStock.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                CRITICAL
              </span>
            )}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Low Stock Alerts</p>
          <h2 className="text-4xl font-bold text-on-surface mt-1">{lowStock.length}</h2>
          <div className="mt-4 flex items-center gap-1 text-red-600 text-xs font-semibold">
            <TrendingUp className="h-3.5 w-3.5" />
            Role-scoped products below threshold
          </div>
        </div>

        {/* KPI 2 – Active Warehouses */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 relative overflow-hidden group hover:border-blue-300/60 transition-all shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500 rounded-t-xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <WarehouseIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Active Warehouses</p>
          <h2 className="text-4xl font-bold text-on-surface mt-1">{warehouses.length}</h2>
          <p className="mt-4 text-xs text-on-surface-variant">Across active regional zones</p>
        </div>

        {/* KPI 3 – Pending POs */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 relative overflow-hidden group hover:border-amber-300/60 transition-all shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500 rounded-t-xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Pending POs</p>
          <h2 className="text-4xl font-bold text-on-surface mt-1">{pendingPoCount}</h2>
          <div className="mt-4 flex items-center gap-1 text-amber-700 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            Awaiting approval or dispatch
          </div>
        </div>

        {/* KPI 4 – Pending Approvals */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-5 relative overflow-hidden group hover:border-indigo-300/60 transition-all shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500 rounded-t-xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
            </div>
            {approvalCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                ACTION REQ.
              </span>
            )}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Pending Approvals</p>
          <h2 className="text-4xl font-bold text-on-surface mt-1">{approvalCount}</h2>
          <p className="mt-4 text-xs text-on-surface-variant">Awaiting manager sign-off</p>
        </div>
      </div>

      {/* ── Middle Row: Bar Chart + AI Insight ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart – Stock Value by Warehouse */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-base font-bold text-on-surface">Stock Coverage by Warehouse</h3>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary/40 inline-block" />
                Target
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
                Actual
              </span>
            </div>
          </div>

          {warehouses.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-on-surface-variant">
              No warehouses found.
            </div>
          ) : (
            <div className="space-y-5">
              {barData.map((wh, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-on-surface truncate max-w-[200px]">{wh.name}</span>
                    <span className="text-on-surface-variant font-mono tabular-nums">{wh.pct}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${wh.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Efficiency Insight */}
        <div className="bg-primary text-white rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[280px]">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-white/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <h4 className="font-bold text-base">AI Efficiency Insight</h4>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              {lowStock.length > 0 ? (
                <>
                  <strong className="text-white">{lowStock.length} SKU{lowStock.length > 1 ? 's' : ''}</strong>{' '}
                  detected below reorder threshold across your assigned warehouses.
                  Recommend generating purchase orders now to prevent stockout delays.
                </>
              ) : (
                <>
                  All monitored stock levels are currently within safe thresholds.
                  Consider auditing reorder points to ensure optimal buffer coverage.
                </>
              )}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
            <Button
              onClick={() => navigate('/purchase-orders')}
              className="w-full bg-white/15 hover:bg-white/25 text-white border-0 font-semibold text-xs py-2.5"
            >
              OPTIMIZE LOGISTICS
            </Button>
            {approvalCount > 0 && (
              <Button
                onClick={() => navigate('/approvals')}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 text-xs py-2.5"
              >
                Review {approvalCount} Pending Approval{approvalCount > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Low Stock Alerts Table ───────────────────────────────── */}
      {lowStock.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="font-bold text-base text-on-surface">Low Stock Alerts</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-full ml-1">
                {lowStock.length} ITEMS
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory')}
              className="text-xs gap-1 text-primary"
            >
              View Inventory <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="bg-surface-container/50 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/40">
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Warehouse</th>
                  <th className="px-4 py-3 text-right">Current Qty</th>
                  <th className="px-4 py-3 text-right">Threshold</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 8).map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="border-t border-outline-variant/30 hover:bg-surface-container/40 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-sm text-on-surface">{item.skuName || '—'}</p>
                      <p className="text-[11px] text-on-surface-variant font-mono">{item.skuId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-on-surface-variant font-medium">
                      {item.warehouseName || item.warehouseId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-red-600 font-mono text-sm">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right text-on-surface-variant font-mono text-xs">
                      {item.reorderThreshold}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/purchase-orders')}
                        className="h-7 px-3 text-[11px] hover:bg-primary hover:text-white transition-all"
                      >
                        Draft PO
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Movements Table ───────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-base text-on-surface">Recent Movements</h3>
          </div>
          <button className="text-xs font-bold text-primary hover:underline underline-offset-4">
            VIEW ALL MOVEMENTS
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="bg-surface-container/50 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/40">
                <th className="px-6 py-3">Date / Time</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Warehouse</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3 text-right">Qty Change</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-on-surface-variant">
                    No recent stock movements recorded.
                  </td>
                </tr>
              ) : (
                movements.map((m, idx) => (
                  <tr
                    key={m.id || idx}
                    className="border-t border-outline-variant/30 hover:bg-surface-container/40 transition-colors"
                  >
                    <td className="px-6 py-4 text-xs font-mono text-on-surface-variant">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-on-surface font-mono">
                      {m.skuName || m.skuId.slice(0, 10) + '…'}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {m.warehouseName || m.warehouseId.slice(0, 8) + '…'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getReasonColor(m.reason)}`}>
                        {m.reason ? m.reason.replace(/_/g, ' ') : 'MOVEMENT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-sm">
                      {m.quantityChange > 0 ? (
                        <span className="text-emerald-600">+{m.quantityChange}</span>
                      ) : (
                        <span className="text-red-500">{m.quantityChange}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-on-surface-variant hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
