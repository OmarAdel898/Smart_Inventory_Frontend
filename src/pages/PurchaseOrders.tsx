import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type LineItem = {
  id: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PurchaseOrder = {
  id: string;
  vendorId: string;
  status: string;
  createdBy: string;
  negotiationRunId: string | null;
  lineItems: LineItem[];
  createdAt: string;
  updatedAt: string;
};

const API_BASE = 'http://localhost:3000';

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  sent: { label: 'Sent', bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  received: { label: 'Received', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

function getStatusStyle(status: string) {
  return (
    STATUS_STYLES[status] || {
      label: status.replace(/_/g, ' '),
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      dot: 'bg-gray-400',
    }
  );
}

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseIdFilter, setWarehouseIdFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadOrders = async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (warehouseIdFilter.trim()) {
        params.append('warehouseId', warehouseIdFilter.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_BASE}/purchase-orders${queryString}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Failed to fetch POs (${response.status})`);
      }

      const body = await response.json();
      const list = body?.success === true ? body.data : Array.isArray(body) ? body : [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong loading purchase orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, [statusFilter, warehouseIdFilter]);

  // Client-side search filtering
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const lower = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(lower) ||
        o.vendorId.toLowerCase().includes(lower) ||
        o.status.toLowerCase().includes(lower)
    );
  }, [orders, searchTerm]);

  // Calculated KPI statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending_approval').length;
    const approved = orders.filter((o) => o.status === 'approved' || o.status === 'sent').length;
    const totalValue = orders.reduce((sum, o) => {
      return sum + o.lineItems.reduce((s, li) => s + Number(li.total || 0), 0);
    }, 0);
    return { total, pending, approved, totalValue };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Procurement Lifecycle</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Purchase Orders</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage and monitor supplier orders, approval workflows, and receiving status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/purchase-orders/new')} className="gap-2 bg-primary text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create Purchase Order
          </Button>
          <Button
            variant="outline"
            onClick={() => loadOrders(undefined, true)}
            disabled={loading || refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Bento Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Total Orders
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-on-surface">{stats.total}</span>
            <FileText className="h-5 w-5 text-accent/60" />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Pending Approval
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-700">{stats.pending}</span>
            <Clock className="h-5 w-5 text-amber-500/60" />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Active / Approved
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-blue-700">{stats.approved}</span>
            <Package className="h-5 w-5 text-blue-500/60" />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Total Order Value
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-700">{formatCurrency(stats.totalValue)}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-outline-variant/60 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          {/* Status Tab Pills */}
          <div className="flex flex-wrap items-center bg-surface-container border border-outline-variant/70 rounded-lg p-1 gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'draft', label: 'Draft' },
              { id: 'pending_approval', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'sent', label: 'Sent' },
              { id: 'received', label: 'Received' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === tab.id
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search PO ID or Vendor ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Warehouse ID Filter Input */}
          <div className="relative w-60">
            <WarehouseIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Filter by Warehouse ID..."
              value={warehouseIdFilter}
              onChange={(e) => setWarehouseIdFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            {warehouseIdFilter && (
              <button
                onClick={() => setWarehouseIdFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">Order Directory</CardTitle>
          <CardDescription>
            Showing {filteredOrders.length} of {orders.length} purchase orders
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="font-medium text-on-surface">Loading purchase orders...</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-on-surface">{error}</p>
              <Button variant="outline" onClick={() => loadOrders(undefined, true)}>
                Try again
              </Button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <FileText className="h-8 w-8 text-accent/50" />
              <p className="font-medium text-on-surface">No purchase orders found.</p>
              <p className="text-xs">Try adjusting your status or warehouse filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container/70">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      PO ID
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Vendor ID
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Line Items
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Total Amount
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Created Date
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {filteredOrders.map((order, index) => {
                    const style = getStatusStyle(order.status);
                    const totalVal = order.lineItems.reduce((sum, li) => sum + Number(li.total || 0), 0);
                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                        className={`border-t border-outline-variant/40 transition-colors hover:bg-surface-container/40 cursor-pointer group ${
                          index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                        }`}
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="font-mono text-sm font-semibold text-accent group-hover:underline">
                            {order.id.slice(0, 8)}
                          </div>
                          <div className="text-[11px] text-on-surface-variant font-mono">
                            {order.id.slice(0, 18)}…
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top text-xs font-mono text-on-surface">
                          {order.vendorId.slice(0, 12)}…
                        </td>

                        <td className="px-6 py-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 align-top text-sm text-right font-medium text-on-surface">
                          {order.lineItems.length} {order.lineItems.length === 1 ? 'item' : 'items'}
                        </td>

                        <td className="px-6 py-4 align-top text-sm text-right font-bold text-on-surface font-mono">
                          {formatCurrency(totalVal)}
                        </td>

                        <td className="px-6 py-4 align-top text-xs text-on-surface-variant">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="px-6 py-4 align-top text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/purchase-orders/${order.id}`);
                            }}
                            className="h-8 gap-1 text-xs hover:bg-surface-container-high"
                          >
                            <Eye className="h-3.5 w-3.5 text-accent" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
