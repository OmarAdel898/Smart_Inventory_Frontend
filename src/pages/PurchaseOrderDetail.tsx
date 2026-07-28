import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const STATUS_STEPS = [
  { id: 'draft', label: 'Draft' },
  { id: 'pending_approval', label: 'Pending Approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'sent', label: 'Sent' },
  { id: 'received', label: 'Received' },
];

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  sent: { label: 'Sent', bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  received: { label: 'Received', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

// Valid transitions strictly per omar.md
const STATUS_TRANSITIONS: Record<
  string,
  { label: string; to: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'destructive' | 'outline' }[]
> = {
  draft: [
    { label: 'Submit for Approval', to: 'pending_approval', icon: Send, variant: 'default' },
  ],
  pending_approval: [
    { label: 'Approve Order', to: 'approved', icon: ShieldCheck, variant: 'default' },
    { label: 'Reject Order', to: 'rejected', icon: XCircle, variant: 'destructive' },
  ],
  approved: [
    { label: 'Mark as Sent', to: 'sent', icon: Send, variant: 'default' },
  ],
  sent: [
    { label: 'Mark as Received', to: 'received', icon: CheckCircle2, variant: 'default' },
  ],
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
        throw new Error(payload?.message || `Failed to load purchase order (${response.status})`);
      }

      const body = await response.json();
      const data = body?.success === true ? body.data : body;
      setOrder(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong loading purchase order.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (toStatus: string) => {
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
        throw new Error(payload?.message || `Transition failed (${response.status})`);
      }

      const body = await response.json();
      const updated = body?.success === true ? body.data : body;
      setOrder(updated);
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
        <p className="font-medium text-on-surface">Loading purchase order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-on-surface">Unable to load purchase order</p>
          <p className="text-sm">{error || 'Purchase order not found'}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/purchase-orders')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  const style = getStatusStyle(order.status);
  const availableTransitions = STATUS_TRANSITIONS[order.status] || [];
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.id === order.status);
  const isRejected = order.status === 'rejected';

  const orderTotal = order.lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <button onClick={() => navigate('/purchase-orders')} className="hover:text-accent transition-colors">
          Purchase Orders
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono font-semibold text-on-surface">{order.id}</span>
      </div>

      {/* Header Info */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/purchase-orders')}
            className="-ml-2 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-on-surface">
                PO: {order.id.slice(0, 8)}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              Vendor ID: <span className="font-mono text-on-surface font-semibold">{order.vendorId}</span>
              <span className="mx-2">•</span>
              Created: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadOrder()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Workflow Stepper */}
      <Card className="border-outline-variant/60 shadow-sm p-4 bg-surface-container-lowest">
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex > idx && !isRejected;
            const isCurrent = currentStepIndex === idx && !isRejected;

            return (
              <div key={step.id} className="flex-1 flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-accent text-white ring-4 ring-accent/20'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:inline ${
                      isCurrent ? 'text-accent' : isCompleted ? 'text-emerald-700' : 'text-on-surface-variant'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-3 rounded-full ${
                      currentStepIndex > idx && !isRejected ? 'bg-emerald-500' : 'bg-surface-container-high'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {isRejected && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>This Purchase Order has been <strong>Rejected</strong>.</span>
          </div>
        )}
      </Card>

      {/* Transition Error Alert */}
      {transitionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {transitionError}
        </div>
      )}

      {/* Status Transition Action Buttons Bar */}
      {availableTransitions.length > 0 && (
        <Card className="border-outline-variant/60 shadow-sm bg-surface">
          <CardHeader className="border-b border-outline-variant/40 py-3">
            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
              Workflow Status Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-wrap gap-3">
            {availableTransitions.map((t) => {
              const IconComp = t.icon;
              return (
                <Button
                  key={t.to}
                  variant={t.variant}
                  onClick={() => handleTransition(t.to)}
                  disabled={transitioning !== null}
                  className="gap-2"
                >
                  {transitioning === t.to ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconComp className="h-4 w-4" />
                  )}
                  {t.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Line Items Table */}
      <Card className="border-outline-variant/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-outline-variant/50 bg-surface flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-on-surface flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            Line Items ({order.lineItems.length})
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">Total Order Amount</p>
            <p className="text-xl font-bold font-mono text-emerald-700">{formatCurrency(orderTotal)}</p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-surface-container/70">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                    SKU ID
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                    Quantity
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                    Unit Price
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface">
                {order.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-on-surface-variant">
                      No line items attached to this purchase order.
                    </td>
                  </tr>
                ) : (
                  order.lineItems.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={`border-t border-outline-variant/40 ${
                        idx % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                      }`}
                    >
                      <td className="px-6 py-4 align-top text-xs font-mono font-semibold text-accent">
                        {item.skuId}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-right font-medium text-on-surface">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-right text-on-surface font-mono">
                        {formatCurrency(Number(item.unitPrice || 0))}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-right font-bold text-on-surface font-mono">
                        {formatCurrency(Number(item.total || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Metadata Card */}
      <Card className="border-outline-variant/60 shadow-sm bg-surface-container-low p-4 text-xs text-on-surface-variant space-y-2">
        <div className="font-semibold text-on-surface uppercase tracking-wider text-[11px]">
          Audit Information
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-outline-variant/40">
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant/70">Created By</span>
            <span className="font-medium text-on-surface">{order.createdBy || 'Manual'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant/70">Negotiation Run ID</span>
            <span className="font-mono text-on-surface">{order.negotiationRunId || 'None'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant/70">Created Timestamp</span>
            <span className="text-on-surface">{formatDate(order.createdAt)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant/70">Last Updated</span>
            <span className="text-on-surface">{formatDate(order.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
