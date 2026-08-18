import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/useCan';
import { ToastContainer } from '@/features/inventory/components/ToastContainer';
import { useToast } from '@/features/inventory/hooks/useToast';

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
  location?: string;
  units?: number;
  stockValue?: number;
  coveragePct?: number;
  capacityUsedPct?: number;
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
  return 'bg-gray-50 text-gray-500';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function CountUp({ value, duration = 900, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    let frame: number;
    let timeout: ReturnType<typeof setTimeout>;
    timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const current = Math.round(from + (value - from) * eased);
        setDisplay(current);
        if (p < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          fromRef.current = value;
        }
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, duration, delay]);

  return <>{display.toLocaleString()}</>;
}

interface DashboardReportData {
  lowStock: LowStockItem[];
  warehouses: Warehouse[];
  movements: StockMovement[];
  pendingPoCount: number;
  approvalCount: number;
  userLabel: string;
  generatedAt: Date;
}

function buildReportHtml(data: DashboardReportData): string {
  const { lowStock, warehouses, movements, pendingPoCount, approvalCount, userLabel, generatedAt } = data;
  const generated = new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' }).format(generatedAt);

  const lowStockRows = lowStock
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.skuName || '—')}</td>
        <td>${escapeHtml(item.skuId)}</td>
        <td>${escapeHtml(item.warehouseName || item.warehouseId)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${item.reorderThreshold}</td>
        <td class="num">${item.safetyStock ?? '—'}</td>
      </tr>`,
    )
    .join('');

  const movementRows = movements.length
    ? movements
        .map(
          (m) => `<tr>
          <td>${escapeHtml(formatDate(m.createdAt))}</td>
          <td>${escapeHtml(m.skuName || m.skuId)}</td>
          <td>${escapeHtml(m.warehouseName || m.warehouseId)}</td>
          <td>${escapeHtml(m.reason ? m.reason.replace(/_/g, ' ') : 'MOVEMENT')}</td>
          <td class="num ${m.quantityChange < 0 ? 'neg' : ''}">${m.quantityChange > 0 ? '+' : ''}${m.quantityChange}</td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="empty">No recent stock movements recorded.</td></tr>';

  const warehouseRows = warehouses.length
    ? warehouses
        .map((w) => `<tr><td>${escapeHtml(w.name)}</td><td>${escapeHtml(w.location || '—')}</td><td>${escapeHtml(w.id)}</td></tr>`)
        .join('')
    : '<tr><td colspan="3" class="empty">No warehouses found.</td></tr>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>StockSavvy System Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 0 0 12px; border-bottom: 2px solid #0f766e; padding-bottom: 6px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  .section { margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f1f5f9; padding: 8px 10px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; color: #475569; border-bottom: 2px solid #cbd5e1; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .neg { color: #dc2626; }
  .empty { text-align: center; color: #94a3b8; padding: 18px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  .kpi .value { font-size: 26px; font-weight: 700; margin-top: 4px; }
  .kpi .value.red { color: #dc2626; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
  @media print { body { margin: 12mm; } .section { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>StockSavvy System Report</h1>
  <div class="sub">Generated ${escapeHtml(generated)} &middot; ${escapeHtml(userLabel)}</div>

  <div class="kpis">
    <div class="kpi"><div class="label">Low Stock Alerts</div><div class="value red">${lowStock.length}</div></div>
    <div class="kpi"><div class="label">Active Warehouses</div><div class="value">${warehouses.length}</div></div>
    <div class="kpi"><div class="label">Pending POs</div><div class="value">${pendingPoCount}</div></div>
    <div class="kpi"><div class="label">Pending Approvals</div><div class="value">${approvalCount}</div></div>
  </div>

  <div class="section">
    <h2>Low Stock Alerts</h2>
    <table>
      <thead><tr><th>Product</th><th>SKU</th><th>Warehouse</th><th class="num">Qty</th><th class="num">Threshold</th><th class="num">Safety Stock</th></tr></thead>
      <tbody>${lowStockRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Recent Stock Movements</h2>
    <table>
      <thead><tr><th>Date / Time</th><th>SKU</th><th>Warehouse</th><th>Reason</th><th class="num">Qty Change</th></tr></thead>
      <tbody>${movementRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Warehouse Overview</h2>
    <table>
      <thead><tr><th>Name</th><th>Location</th><th>ID</th></tr></thead>
      <tbody>${warehouseRows}</tbody>
    </table>
  </div>

  <div class="footer">StockSavvy &middot; Enterprise Inventory Management &middot; ${escapeHtml(generated)}</div>
</body>
</html>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { toasts, showToast, dismissToast } = useToast();

  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [skus, setSkus] = useState<{ id: string; name: string }[]>([]);
  const [pendingPoCount, setPendingPoCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const skuMap = useMemo(() => {
    const map: Record<string, string> = {};
    skus.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [skus]);

  const warehouseMap = useMemo(() => {
    const map: Record<string, string> = {};
    warehouses.forEach((w) => { map[w.id] = w.name; });
    return map;
  }, [warehouses]);

  // Pagination & Search for Low Stock
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Thresholds modal state
  const [thresholdItem, setThresholdItem] = useState<LowStockItem | null>(null);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [selectedStockLevel, setSelectedStockLevel] = useState<any | null>(null);
  const [loadingStockLevels, setLoadingStockLevels] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    reorderThreshold: 0,
    safetyStock: 0,
  });

  // Pagination & Search for Movements
  const [movementSearchTerm, setMovementSearchTerm] = useState('');
  const [movementCurrentPage, setMovementCurrentPage] = useState(1);
  const movementsPerPage = 5;

  const load = useCallback(async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [
      lowStockData,
      warehouseData,
      poData,
      approvalData,
      movementData,
      skuData,
    ] = await Promise.all([
      safeFetch<LowStockItem[]>(`${API_BASE}/stock-levels/low-stock`, signal),
      safeFetch<Warehouse[]>(`${API_BASE}/warehouses/summary`, signal),
      safeFetch<{ data?: unknown[] } | unknown[]>(`${API_BASE}/purchase-orders?status=pending_approval&limit=100`, signal),
      safeFetch<{ data?: unknown[] } | unknown[]>(`${API_BASE}/approvals?status=pending&limit=100`, signal),
      safeFetch<StockMovement[]>(`${API_BASE}/inventory/stock-movements?limit=10`, signal),
      safeFetch<{ id: string; name: string }[]>(`${API_BASE}/sku`, signal),
    ]);

    setLowStock(Array.isArray(lowStockData) ? lowStockData : []);
    setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
    setSkus(Array.isArray(skuData) ? skuData : (skuData as any)?.data || []);

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

  // Derived state for Low Stock Table
  const filteredLowStock = lowStock.filter((item) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      (item.skuName || '').toLowerCase().includes(lower) ||
      (item.skuId || '').toLowerCase().includes(lower) ||
      (item.warehouseName || '').toLowerCase().includes(lower)
    );
  });

  const totalPages = Math.ceil(filteredLowStock.length / itemsPerPage);
  const paginatedLowStock = filteredLowStock.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Derived state for Movements Table
  const filteredMovements = movements.filter((m) => {
    if (!movementSearchTerm) return true;
    const lower = movementSearchTerm.toLowerCase();
    return (
      (m.skuName || '').toLowerCase().includes(lower) ||
      (m.skuId || '').toLowerCase().includes(lower) ||
      (m.warehouseName || '').toLowerCase().includes(lower) ||
      (m.reason || '').toLowerCase().includes(lower)
    );
  });
  const totalMovementPages = Math.ceil(filteredMovements.length / movementsPerPage);
  const paginatedMovements = filteredMovements.slice((movementCurrentPage - 1) * movementsPerPage, movementCurrentPage * movementsPerPage);

  const openThresholdModal = async (item: LowStockItem) => {
    setThresholdItem(item);
    setStockLevels([]);
    setSelectedStockLevel(null);
    setLoadingStockLevels(true);

    try {
      const token = getToken();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Fetch stock levels for this SKU
      let res = await fetch(`${API_BASE}/stock-levels?skuId=${item.skuId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error('Failed to load stock levels');

      let body = await res.json();
      let items = body.success && Array.isArray(body.data) ? body.data : Array.isArray(body.data?.items) ? body.data.items : [];

      if (items.length === 0) {
        // Auto-initialize if missing
        const whRes = await fetch(`${API_BASE}/warehouses`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (whRes.ok) {
          const whBody = await whRes.json();
          const whs = whBody?.data || (Array.isArray(whBody) ? whBody : []);

          for (const wh of whs) {
            await fetch(`${API_BASE}/inventory/stock-movements`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                skuId: item.skuId,
                warehouseId: wh.id,
                quantityChange: 0,
                reason: 'manual_adjustment',
                note: 'Auto-initialized stock level for threshold configuration',
              }),
            });
          }

          res = await fetch(`${API_BASE}/stock-levels?skuId=${item.skuId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (res.ok) {
            body = await res.json();
            items = body.success && Array.isArray(body.data) ? body.data : Array.isArray(body.data?.items) ? body.data.items : [];
          }
        }
      }

      setStockLevels(items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error loading stock levels', 'error');
      setStockLevels([]);
    } finally {
      setLoadingStockLevels(false);
    }
  };

  const handleSaveThreshold = async () => {
    if (!selectedStockLevel) return;
    setSavingThreshold(true);
    try {
      const token = getToken();
      const warehouseId = selectedStockLevel.warehouseId;
      const res = await fetch(`${API_BASE}/warehouses/${warehouseId}/stock-levels/${selectedStockLevel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reorderThreshold: Number(thresholdForm.reorderThreshold),
          safetyStock: Number(thresholdForm.safetyStock),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update thresholds');
      }
      
      setStockLevels((prev) => prev.map((sl) => 
        sl.id === selectedStockLevel.id 
          ? { ...sl, reorderThreshold: Number(thresholdForm.reorderThreshold), safetyStock: Number(thresholdForm.safetyStock) } 
          : sl
      ));
      
      // Update local state so it reflects immediately
      setLowStock((prev) => prev.map((item) => {
        if (item.skuId === selectedStockLevel.skuId && item.warehouseId === warehouseId) {
          return { ...item, reorderThreshold: Number(thresholdForm.reorderThreshold), safetyStock: Number(thresholdForm.safetyStock) };
        }
        return item;
      }));
      
      setSelectedStockLevel(null);
      showToast('Thresholds updated successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error updating thresholds', 'error');
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleExportReport = () => {
    const html = buildReportHtml({
      lowStock,
      warehouses,
      movements,
      pendingPoCount,
      approvalCount,
      userLabel: user ? `${user.name || user.username} (${user.role.replace(/_/g, ' ')})` : 'Authenticated user',
      generatedAt: new Date(),
    });

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-9 w-72" />
          </div>
          <div className="skeleton h-10 w-56 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[140px] rounded-[2rem]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 skeleton h-[320px] rounded-xl" />
          <div className="skeleton h-[320px] rounded-xl" />
        </div>
      </div>
    );
  }

// Compute bar chart data from warehouses (score = stock coverage % blended with warehouse capacity usage %)
  const barData = warehouses.slice(0, 5).map((wh) => ({
    id: wh.id,
    name: wh.name,
    pct: Math.min(100, Math.round(((wh.coveragePct ?? 0) + (wh.capacityUsedPct ?? 0)) / 2)),
    units: wh.units ?? 0,
  }));

  const scoreColor = (pct: number) => {
    if (pct <= 0) return 'linear-gradient(to top, #D1D5DB, #E5E7EB)';
    return 'linear-gradient(to top, #93C5FD, #93C5FD)';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning!';
    if (hour < 18) return 'Good Afternoon!';
    return 'Good Evening!';
  };

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="text-[18px] text-gray-600 mb-1 font-medium">
            {getGreeting()} {user?.name || user?.username || 'usef'},
          </p>
          <h1 className="text-[36px] font-black text-[#0A1128] leading-tight tracking-tight">System Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-semibold text-gray-700 shadow-sm transition-all">
            <Clock className="w-4 h-4 text-gray-500" /> LAST 24 HOURS
          </button>
          <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all">
            <FileDown className="w-4 h-4" /> EXPORT REPORT
          </button>
          <button onClick={() => void load(undefined, true)} disabled={refreshing} className="flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* ── 4 KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* KPI 1 – Low Stock Alerts */}
        <div className="bg-[#FFD9DF] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <AlertTriangle className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Low Stock Alerts</span>
            </div>
            {lowStock.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-black bg-black/5 px-2.5 py-0.5 rounded-full">
                CRITICAL
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900"><CountUp value={lowStock.length} /></span>
          </div>
        </div>

        {/* KPI 2 – Active Warehouses */}
        <div className="bg-[#E6F4FF] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <WarehouseIcon className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Active Warehouses</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900"><CountUp value={warehouses.length} /></span>
          </div>
        </div>

        {/* KPI 3 – Pending POs */}
        <div className="bg-[#FFF48F] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <ShoppingBag className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Pending POs</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900"><CountUp value={pendingPoCount} /></span>
          </div>
        </div>

        {/* KPI 4 – Pending Approvals */}
        <div className="bg-[#F0E6FF] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <CheckSquare className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Pending Approvals</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900"><CountUp value={approvalCount} /></span>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Bar Chart + AI Insight ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart – Stock Value by Warehouse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 shadow-sm"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-[16px] font-bold text-gray-900">Capacity & Coverage Score by Warehouse</h3>
            <div className="flex items-center gap-4 text-[12px] font-semibold text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: scoreColor(60) }} />
                Score (coverage + capacity)
              </span>
            </div>
          </div>

          {warehouses.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[13px] font-medium text-gray-500">
              No warehouses found.
            </div>
          ) : (
            <div className="flex gap-6 h-[220px] w-full overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {barData.map((wh, i) => (
                <motion.div
                  key={wh.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center h-full min-w-[60px] shrink-0"
                >
                  <div className="text-gray-500 font-mono font-bold text-[11px] mb-2">
                    <CountUp value={wh.pct} duration={750} delay={250 + i * 70} />%
                  </div>
                  <div className="w-12 bg-[#E6F4FF] rounded-t-lg flex-1 flex items-end overflow-hidden">
                    <motion.div
                      className="w-full h-full rounded-t-lg"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: Math.min(100, wh.pct) / 100 }}
                      style={{ transformOrigin: 'bottom', background: scoreColor(wh.pct) }}
                      transition={{ duration: 1.1, delay: 0.25 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <div className="font-bold text-gray-800 text-[12px] truncate w-16 text-center mt-3" title={wh.name}>
                    {wh.name}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* AI Efficiency Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#0066CC] text-white rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[280px]"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-white/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-[#FFF48F]" />
              </div>
              <h4 className="font-bold text-[16px]">AI Efficiency Insight</h4>
            </div>
            <p className="text-[14px] text-white/90 leading-relaxed font-medium">
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
            <button
              onClick={() => navigate('/purchase-orders')}
              className="w-full bg-white text-[#0066CC] hover:bg-[#E6F4FF] rounded-full font-bold text-[13px] py-2.5 transition-colors shadow-sm"
            >
              OPTIMIZE LOGISTICS
            </button>
            {approvalCount > 0 && (
              <button
                onClick={() => navigate('/approvals')}
                className="w-full border border-white/20 text-white hover:bg-white/10 rounded-full font-bold text-[13px] py-2.5 transition-colors"
              >
                Review {approvalCount} Pending Approval{approvalCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Low Stock Alerts Table ───────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[16px] text-gray-900">Low Stock Alerts</h3>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B30024] bg-[#FFD9DF] px-2.5 py-0.5 rounded-full ml-2">
                {lowStock.length} ITEMS
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium w-[220px] outline-none focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-1.5 text-[13px] font-bold text-[#0066CC] hover:text-[#004C99]"
              >
                View Inventory <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Product Name</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Warehouse</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Current Qty</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Threshold</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLowStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[13px] font-medium text-gray-500">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  paginatedLowStock.map((item, idx) => (
                    <motion.tr
                      key={item.id || idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.35 + idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0 group"
                    >
                      <td className="px-6 py-4 align-middle">
                        <p className="font-bold text-[14px] text-gray-900 leading-tight">{item.skuName || skuMap[item.skuId] || '—'}</p>
                        <p className="text-[12px] text-gray-500 font-mono font-medium mt-0.5">{item.skuId.slice(0, 8)}…</p>
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] text-gray-700 font-semibold">
                        {item.warehouseName || warehouseMap[item.warehouseId] || item.warehouseId.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 align-middle text-right font-black text-[#B30024] font-mono text-[15px]">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-gray-500 font-mono font-semibold text-[13px]">
                        {item.reorderThreshold}
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          {can('inventory.manage') && (
                            <button
                              onClick={() => openThresholdModal(item)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-[#F0E6FF] hover:text-[#6500E6] transition-colors"
                              title="Edit Threshold"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate('/purchase-orders')}
                            className="px-4 py-1.5 rounded-full border border-[#E6F4FF] text-[#0066CC] text-[12px] font-bold bg-[#E6F4FF] hover:bg-[#D0E9FF] transition-all shadow-sm"
                          >
                            Draft PO
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/30">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                      currentPage === i + 1 
                        ? 'bg-[#E6F4FF] text-[#0066CC]' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      {/* ── Recent Movements Table ───────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[16px] text-gray-900">Recent Movements</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066CC] bg-[#E6F4FF] px-2.5 py-0.5 rounded-full ml-2">
              {movements.length} ITEMS
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search movements..." 
                value={movementSearchTerm}
                onChange={(e) => {
                  setMovementSearchTerm(e.target.value);
                  setMovementCurrentPage(1);
                }}
                className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium w-[220px] outline-none focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Date / Time</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Product</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Warehouse</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Reason</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Qty Change</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[13px] font-medium text-gray-500">
                    No matching movements found.
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((m, idx) => (
                  <tr key={m.id || idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0 group">
                    <td className="px-6 py-4 align-middle">
                      <span className="font-mono text-[13px] font-semibold text-gray-700 whitespace-nowrap">{formatDate(m.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <p className="font-bold text-[14px] text-gray-900 leading-tight">{m.skuName || skuMap[m.skuId] || '—'}</p>
                      <p className="text-[12px] text-gray-500 font-mono font-medium mt-0.5">{m.skuId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-6 py-4 align-middle text-[13px] text-gray-700 font-semibold">
                      {m.warehouseName || warehouseMap[m.warehouseId] || m.warehouseId.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getReasonColor(m.reason)}`}>
                        {m.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={`px-6 py-4 align-middle text-right font-black font-mono text-[15px] ${m.quantityChange > 0 ? 'text-[#0066CC]' : m.quantityChange < 0 ? 'text-[#B30024]' : 'text-gray-500'}`}>
                      {m.quantityChange > 0 ? '+' : ''}{m.quantityChange}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Movements Pagination Footer */}
        {totalMovementPages > 1 && (
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/30">
            <button 
              onClick={() => setMovementCurrentPage(p => Math.max(1, p - 1))}
              disabled={movementCurrentPage === 1}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalMovementPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setMovementCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                    movementCurrentPage === i + 1 
                      ? 'bg-[#E6F4FF] text-[#0066CC]' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setMovementCurrentPage(p => Math.min(totalMovementPages, p + 1))}
              disabled={movementCurrentPage === totalMovementPages}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* THRESHOLDS MODAL */}
      {thresholdItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-gray-400" />
                Set Thresholds: {thresholdItem.skuName || skuMap[thresholdItem.skuId] || thresholdItem.skuId.slice(0, 8)}
              </h2>
              <button
                onClick={() => {
                  setThresholdItem(null);
                  setSelectedStockLevel(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-[13px] text-gray-500 mb-6 font-medium">
                Configure reorder thresholds and safety stock levels for this product across all active warehouses.
              </p>
              
              {loadingStockLevels ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <p className="text-[13px] font-medium text-gray-500">Loading stock levels...</p>
                </div>
              ) : stockLevels.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-[13px] font-medium text-gray-500">No active stock levels found for this SKU.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockLevels.map(sl => {
                    const isEditing = selectedStockLevel?.id === sl.id;
                    const whName = warehouses.find(w => w.id === sl.warehouseId)?.name || 'Unknown Warehouse';
                    return (
                      <div key={sl.id} className={`p-4 rounded-full font-bold border transition-all ${isEditing ? 'border-[#0066CC] bg-[#E6F4FF]/30 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        {isEditing ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-bold text-[14px] text-gray-900">{whName}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
                                  Reorder Threshold
                                </label>
                                <input 
                                  type="number" 
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 outline-none transition-all"
                                  value={thresholdForm.reorderThreshold}
                                  onChange={(e) => setThresholdForm({ ...thresholdForm, reorderThreshold: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
                                  Safety Stock
                                </label>
                                <input 
                                  type="number" 
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 outline-none transition-all"
                                  value={thresholdForm.safetyStock}
                                  onChange={(e) => setThresholdForm({ ...thresholdForm, safetyStock: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <button onClick={() => setSelectedStockLevel(null)} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all px-3 py-1.5 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                                Cancel
                              </button>
                              <button onClick={handleSaveThreshold} disabled={savingThreshold} className="flex items-center px-4 py-1.5 rounded-full text-[12px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all disabled:opacity-50">
                                {savingThreshold && <Loader2 className="h-3 w-3 animate-spin mr-2" />} Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-[14px] text-gray-900 mb-1">{whName}</div>
                              <div className="flex gap-4 text-[13px]">
                                <div>Threshold: <span className="font-medium text-gray-900">{sl.reorderThreshold}</span></div>
                                <div>Safety: <span className="font-medium text-gray-900">{sl.safetyStock ?? '—'}</span></div>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedStockLevel(sl);
                                setThresholdForm({
                                  reorderThreshold: sl.reorderThreshold || 0,
                                  safetyStock: sl.safetyStock || 0,
                                });
                              }}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-bold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
