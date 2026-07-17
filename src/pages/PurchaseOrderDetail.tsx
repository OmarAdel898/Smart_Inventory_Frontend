import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const STATUS_TRANSITIONS: Record<string, { label: string; to: string; variant: 'default' | 'destructive' | 'outline' }[]> = {
  draft: [
    { label: 'Submit for Approval', to: 'pending_approval', variant: 'default' },
    { label: 'Reject', to: 'rejected', variant: 'destructive' },
  ],
  pending_approval: [
    { label: 'Approve', to: 'approved', variant: 'default' },
    { label: 'Reject', to: 'rejected', variant: 'destructive' },
  ],
  approved: [{ label: 'Mark as Sent', to: 'sent', variant: 'default' }],
  sent: [{ label: 'Mark as Received', to: 'received', variant: 'default' }],
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

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const loadOrder = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/purchase-orders/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.message || `Failed to load purchase order (${response.status})`;
        throw new Error(message);
      }

      const body = (await response.json()) as { success: boolean; data: PurchaseOrder };
      setOrder(body.data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong while loading the purchase order.');
    } finally {
      setLoading(false);
    }
  };

  const transitionStatus = async (toStatus: string) => {
    setTransitioning(toStatus);
    setTransitionError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/purchase-orders/${id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: toStatus }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.message || `Transition failed (${response.status})`;
        throw new Error(message);
      }

      const body = (await response.json()) as { success: boolean; data: PurchaseOrder };
      setOrder(body.data);
    } catch (err) {
      setTransitionError(err instanceof Error ? err.message : 'Transition failed.');
    } finally {
      setTransitioning(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadOrder(controller.signal);
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="font-medium text-on-surface">Loading purchase order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-on-surface">Unable to load purchase order</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/purchase-orders')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Button>
      </div>
    );
  }

  if (!order) return null;

  const style = getStatusStyle(order.status);
  const availableTransitions = STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <button onClick={() => navigate('/purchase-orders')} className="hover:text-accent transition-colors">
          Purchase Orders
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-on-surface font-medium font-mono">{order.id.slice(0, 8)}</span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchase-orders')} className="mt-1 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-surface font-mono">{order.id.slice(0, 8)}</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Vendor: <span className="font-medium text-on-surface font-mono">{order.vendorId.slice(0, 8)}</span>
              <span className="mx-2">·</span>
              Created: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${style.bg} ${style.text}`}>
            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
            {order.status.replace(/_/g, ' ')}
          </span>
          <Button variant="outline" onClick={() => loadOrder()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {transitionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {transitionError}
        </div>
      )}

      {availableTransitions.length > 0 && (
        <Card className="border-outline-variant/60 shadow-sm">
          <CardHeader className="border-b border-outline-variant/50 bg-surface py-3">
            <CardTitle className="text-sm font-medium text-on-surface">Status Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex gap-3">
            {availableTransitions.map((t) => (
              <Button
                key={t.to}
                variant={t.variant}
                onClick={() => transitionStatus(t.to)}
                disabled={transitioning !== null}
                className="gap-2"
              >
                {transitioning === t.to && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-outline-variant/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-lg text-on-surface">Line Items ({order.lineItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-surface-container/70">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Total</th>
                </tr>
              </thead>
              <tbody className="bg-surface">
                {order.lineItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-t border-outline-variant/40 ${
                      index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                    }`}
                  >
                    <td className="px-6 py-3 text-sm font-medium text-on-surface font-mono">{item.skuId.slice(0, 8)}</td>
                    <td className="px-6 py-3 text-sm text-right text-on-surface">{item.quantity}</td>
                    <td className="px-6 py-3 text-sm text-right text-on-surface">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-6 py-3 text-sm text-right font-medium text-on-surface">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-6 text-xs text-on-surface-variant pb-8">
        <span>Created: {formatDate(order.createdAt)}</span>
        <span>Updated: {formatDate(order.updatedAt)}</span>
        {order.createdBy !== 'manual' && <span>Created by: {order.createdBy}</span>}
        {order.negotiationRunId && <span>Negotiation: {order.negotiationRunId.slice(0, 8)}</span>}
      </div>
    </div>
  );
}
