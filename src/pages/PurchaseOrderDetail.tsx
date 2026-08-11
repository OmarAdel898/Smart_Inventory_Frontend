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
  Star,
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
  receiptRating: number | null;
  damagedUnits: number | null;
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
  const [ratingStars, setRatingStars] = useState(0);
  const [damagedUnits, setDamagedUnits] = useState('');

  const loadOrder = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setRatingStars(0);
    setDamagedUnits('');

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/purchase-orders/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Failed to fetch PO (${response.status})`);
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

  const handleTransition = async (toStatus: string, rating?: { ratingStars?: number; damagedUnits?: number }) => {
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
        body: JSON.stringify({ status: toStatus, ...rating }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Transition failed (${response.status})`);
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
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#0066CC]" />
        <p className="font-medium text-gray-900">Loading purchase order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-gray-900">Unable to load purchase order</p>
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
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button onClick={() => navigate('/purchase-orders')} className="hover:text-[#0066CC] transition-colors">
          Purchase Orders
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono font-semibold text-gray-900">{order.id}</span>
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
              <h1 className="text-2xl font-bold font-mono tracking-tight text-gray-900">
                PO: {order.id.slice(0, 8)}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Vendor ID: <span className="font-mono text-gray-900 font-semibold">{order.vendorId}</span>
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
      <Card className="border-gray-200 shadow-sm p-4 bg-gray-50/50">
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
                        ? 'bg-[#E6F4FF] text-[#0066CC] hover:bg-[#D0E9FF] ring-4 ring-accent/20'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:inline ${
                      isCurrent ? 'text-[#0066CC]' : isCompleted ? 'text-emerald-700' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-3 rounded-full ${
                      currentStepIndex > idx && !isRejected ? 'bg-emerald-500' : 'bg-gray-100'
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

      {/* Stored Receipt Rating Banner */}
      {order.status === 'received' && order.receiptRating != null && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${star <= order.receiptRating! ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <span>
            Receiving staff rated this delivery <strong>{Number(order.receiptRating)}/5</strong>
            {Number(order.damagedUnits || 0) > 0 && (
              <>
                {' '}
                — <strong>{Number(order.damagedUnits)}</strong> damaged unit(s) reported
              </>
            )}
          </span>
        </div>
      )}

      {/* Status Transition Action Buttons Bar */}
      {availableTransitions.length > 0 && (
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardHeader className="border-b border-gray-200 py-3">
            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-gray-500">
              Workflow Status Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-wrap gap-3">
            {availableTransitions.map((t) => {
              const IconComp = t.icon;

              if (t.to === 'received') {
                return (
                  <div
                    key={t.to}
                    className="w-full border border-blue-200 bg-blue-50/40 rounded-lg p-3 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Receiving feedback
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            onClick={() => setRatingStars(star)}
                            disabled={transitioning !== null}
                            className="p-0.5"
                          >
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                star <= ratingStars
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300 hover:text-amber-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={0}
                        placeholder="Damaged units"
                        value={damagedUnits}
                        onChange={(e) => setDamagedUnits(e.target.value)}
                        disabled={transitioning !== null}
                        className="w-28 h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]/30 outline-none"
                      />
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRatingStars(0);
                            setDamagedUnits('');
                          }}
                          disabled={transitioning !== null}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5"
                          onClick={() =>
                            handleTransition('received', {
                              ...(ratingStars > 0 ? { ratingStars } : {}),
                              ...(damagedUnits !== ''
                                ? { damagedUnits: Math.max(0, Math.floor(Number(damagedUnits) || 0)) }
                                : {}),
                            })
                          }
                          disabled={transitioning !== null}
                        >
                          {transitioning === 'received' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Receive & Rate
                        </Button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Rating and damage feed the Feedback Agent's vendor review — written into the
                      knowledge base as searchable content.
                    </p>
                  </div>
                );
              }

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
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-200 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-[#0066CC]" />
            Line Items ({order.lineItems.length})
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Order Amount</p>
            <p className="text-xl font-bold font-mono text-emerald-700">{formatCurrency(orderTotal)}</p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    SKU ID
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Quantity
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Unit Price
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {order.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-gray-500">
                      No line items attached to this purchase order.
                    </td>
                  </tr>
                ) : (
                  order.lineItems.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={`border-t border-gray-200 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-white'
                      }`}
                    >
                      <td className="px-6 py-4 align-top text-xs font-mono font-semibold text-[#0066CC]">
                        {item.skuId}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-right font-medium text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-right text-gray-900 font-mono">
                        {formatCurrency(Number(item.unitPrice || 0))}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-right font-bold text-gray-900 font-mono">
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
      <Card className="border-gray-200 shadow-sm bg-gray-50-low p-4 text-xs text-gray-500 space-y-2">
        <div className="font-semibold text-gray-900 uppercase tracking-wider text-[11px]">
          Audit Information
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-200">
          <div>
            <span className="block text-[10px] uppercase text-gray-500/70">Created By</span>
            <span className="font-medium text-gray-900">{order.createdBy || 'Manual'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-gray-500/70">Negotiation Run ID</span>
            <span className="font-mono text-gray-900">{order.negotiationRunId || 'None'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-gray-500/70">Created Timestamp</span>
            <span className="text-gray-900">{formatDate(order.createdAt)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-gray-500/70">Last Updated</span>
            <span className="text-gray-900">{formatDate(order.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
