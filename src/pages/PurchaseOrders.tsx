import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type LineItem = {
  id: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type PurchaseOrder = {
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

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  pending_approval: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  received: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES.draft;
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

function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
      <div className="text-center">
        <p className="font-medium text-on-surface">Loading purchase orders</p>
        <p className="text-sm">Fetching the latest purchase orders from the inventory system.</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
        <FileText className="h-5 w-5 text-accent" />
      </div>
      <div className="text-center max-w-sm">
        <p className="font-medium text-on-surface">No purchase orders found</p>
        <p className="text-sm">There are no purchase orders in the system yet. Create one to get started.</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div className="text-center max-w-md">
        <p className="font-medium text-on-surface">Unable to load purchase orders</p>
        <p className="text-sm">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const orderCountLabel = `${orders.length} order${orders.length === 1 ? '' : 's'}`;

  const loadOrders = async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/purchase-orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.message || `Failed to load purchase orders (${response.status})`;
        throw new Error(message);
      }

      const body = (await response.json()) as { success: boolean; data: PurchaseOrder[] };
      setOrders(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong while loading purchase orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Procurement</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Purchase Orders</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage and track purchase orders through their full lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Total Orders</p>
              <p className="text-base font-semibold text-on-surface">{orderCountLabel}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => loadOrders(undefined, true)} disabled={loading || refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">Order Directory</CardTitle>
          <CardDescription>Full list of purchase orders with status tracking.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadOrders()} />
          ) : orders.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container/70">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Vendor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Line Items</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {orders.map((order, index) => {
                    const style = getStatusStyle(order.status);
                    return (
                      <tr
                        key={order.id}
                        className={`border-t border-outline-variant/40 transition-colors hover:bg-surface-container/40 cursor-pointer ${
                          index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                        }`}
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-accent font-mono text-sm">{order.id.slice(0, 8)}</div>
                          <div className="mt-1 text-xs text-on-surface-variant">Full ID: {order.id.slice(0, 12)}…</div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm font-medium text-on-surface font-mono">
                          {order.vendorId.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-right text-on-surface">
                          {order.lineItems.length}
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-right font-semibold text-on-surface">
                          {formatCurrency(order.lineItems.reduce((sum, li) => sum + Number(li.total), 0))}
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-on-surface-variant">
                          {formatDate(order.createdAt)}
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
