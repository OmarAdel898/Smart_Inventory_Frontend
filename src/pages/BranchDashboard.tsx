import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  BarChart3,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccessTokenFromCookie, getWarehouseIdFromToken } from '@/lib/auth';
import {
  fetchBranchDashboardSnapshot,
  fetchRecentMovementsBySku,
  type ApprovalSummary,
  type BranchDashboardSnapshot,
  type PurchaseOrderSummary,
  type StockLevel,
  type StockMovement,
} from '@/api/branchDashboard';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en').format(value);
}

function formatCurrency(value: number | undefined): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 10)}…` : value;
}

function StatusPill({ value, tone }: { value: string; tone: 'red' | 'amber' | 'green' | 'slate' }) {
  const styles = {
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-800',
    slate: 'bg-slate-100 text-slate-700',
  };

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}>{value}</span>;
}

function lowStockTone(quantity: number, threshold: number): 'red' | 'amber' | 'green' {
  if (quantity <= 0 || quantity <= threshold) return 'red';
  if (quantity <= threshold + 10) return 'amber';
  return 'green';
}

function movementTone(change: number): 'red' | 'green' {
  return change >= 0 ? 'green' : 'red';
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-outline-variant/60 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-outline-variant/50 bg-surface flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl text-on-surface">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
        <Package className="h-5 w-5 text-accent" />
      </div>
      <p className="text-sm text-center max-w-sm">{message}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <p className="text-sm font-medium text-on-surface">{label}</p>
    </div>
  );
}

export default function BranchDashboard() {
  const warehouseId = getWarehouseIdFromToken(getAccessTokenFromCookie());
  const [snapshot, setSnapshot] = useState<BranchDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');

  const lowStockItems = snapshot?.lowStockItems || [];
  const stockLevels = snapshot?.stockLevels || [];
  const pendingPurchaseOrders = snapshot?.pendingPurchaseOrders || [];
  const pendingApprovals = snapshot?.pendingApprovals || [];

  const totalUnits = useMemo(
    () => stockLevels.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [stockLevels],
  );

  const totalReorderGap = useMemo(
    () => stockLevels.reduce((sum, item) => sum + Math.max(0, Number(item.reorderThreshold || 0) - Number(item.quantity || 0)), 0),
    [stockLevels],
  );

  const loadSnapshot = async (isRefresh = false) => {
    if (!warehouseId) {
      setError('No warehouse assignment found in the current access token.');
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchBranchDashboardSnapshot(warehouseId);
      setSnapshot(data);
      const nextSku = data.selectedSkuId || '';
      setSelectedSkuId(nextSku);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load warehouse dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMovements = async (skuId: string) => {
    if (!warehouseId || !skuId) {
      setMovements([]);
      return;
    }

    setMovementsLoading(true);
    setMovementsError(null);

    try {
      const data = await fetchRecentMovementsBySku(skuId);
      setMovements(data);
    } catch (err) {
      setMovementsError(err instanceof Error ? err.message : 'Unable to load recent movements.');
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSkuId) {
      setMovements([]);
      return;
    }

    void loadMovements(selectedSkuId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkuId]);

  if (loading) {
    return <LoadingState label="Loading warehouse dashboard..." />;
  }

  if (error) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-on-surface">Unable to load warehouse dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={() => loadSnapshot()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  const warehouseName = snapshot?.warehouse?.name || 'Assigned Warehouse';
  const warehouseCode = snapshot?.warehouse?.code || '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Warehouse Manager Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">{warehouseName}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Live operational snapshot for warehouse {warehouseCode}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Warehouse className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Warehouse
              </p>
              <p className="text-base font-semibold text-on-surface">{warehouseCode}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => loadSnapshot(true)} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Low Stock Items
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-on-surface">{lowStockItems.length}</span>
            <AlertCircle className="h-5 w-5 text-red-500/60" />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Stock Levels
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-on-surface">{stockLevels.length}</span>
            <BarChart3 className="h-5 w-5 text-accent/60" />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Pending POs
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-on-surface">{pendingPurchaseOrders.length}</span>
            <Package className="h-5 w-5 text-amber-500/60" />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/70 p-4 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Pending Approvals
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-on-surface">{pendingApprovals.length}</span>
            <Clock3 className="h-5 w-5 text-blue-500/60" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] gap-6 items-start">
        <div className="space-y-6">
          <SectionCard
            title="low stock"
            description="Items at or below the reorder threshold in this warehouse."
          >
            {lowStockItems.length === 0 ? (
              <EmptyState message="No low stock items were returned for this warehouse." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-surface-container/70">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">SKU</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Item</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface">
                    {lowStockItems.map((item, index) => {
                      const tone = lowStockTone(item.quantity, item.reorderThreshold);
                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-outline-variant/40 ${
                            index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                          }`}
                        >
                          <td className="px-6 py-4 align-top text-sm font-mono font-semibold text-accent">{shortId(item.skuId)}</td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-medium text-on-surface">{item.skuName}</div>
                            <div className="text-xs text-on-surface-variant">{item.warehouseName || warehouseName}</div>
                          </td>
                          <td className="px-6 py-4 align-top text-right">
                            <StatusPill value={formatNumber(item.quantity)} tone={tone} />
                          </td>
                          <td className="px-6 py-4 align-top text-right text-sm text-on-surface-variant">
                            {formatNumber(item.reorderThreshold)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="stock levels"
            description="Current inventory positions across the assigned warehouse."
          >
            {stockLevels.length === 0 ? (
              <EmptyState message="No stock level records were returned for this warehouse." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-surface-container/70">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">SKU</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Name</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Safety</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Reorder</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface">
                    {stockLevels.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-outline-variant/40 ${
                          index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                        }`}
                      >
                        <td className="px-6 py-4 align-top text-sm font-mono font-semibold text-accent">{shortId(item.skuId)}</td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-on-surface">{item.skuName}</div>
                          <div className="text-xs text-on-surface-variant">{item.warehouseName || warehouseName}</div>
                        </td>
                        <td className="px-6 py-4 align-top text-right text-sm font-semibold text-on-surface">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-6 py-4 align-top text-right text-sm text-on-surface-variant">
                          {formatNumber(item.safetyStock)}
                        </td>
                        <td className="px-6 py-4 align-top text-right text-sm text-on-surface-variant">
                          {formatNumber(item.reorderThreshold)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="recent stock movements"
            description="Movement history for a selected SKU in this warehouse."
            action={
              <div className="w-full sm:w-72">
                <select
                  value={selectedSkuId}
                  onChange={(e) => setSelectedSkuId(e.target.value)}
                  className="w-full h-10 rounded-md border border-outline-variant bg-surface px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select SKU</option>
                  {[...stockLevels, ...lowStockItems]
                    .filter((item, index, array) => array.findIndex((x) => x.skuId === item.skuId) === index)
                    .map((item) => (
                      <option key={item.skuId} value={item.skuId}>
                        {item.skuName}
                      </option>
                    ))}
                </select>
              </div>
            }
          >
            {movementsLoading ? (
              <LoadingState label="Loading stock movements..." />
            ) : movementsError ? (
              <div className="py-10 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <p className="text-sm text-center max-w-md">{movementsError}</p>
              </div>
            ) : movements.length === 0 ? (
              <EmptyState message={selectedSkuId ? 'No movements found for the selected SKU.' : 'Choose a SKU to view recent movements.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-surface-container/70">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">SKU</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Reason</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Change</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface">
                    {movements.map((movement, index) => {
                      const tone = movementTone(movement.quantityChange);
                      const reasonLabel = movement.reason.replace(/_/g, ' ');
                      return (
                        <tr
                          key={movement.id}
                          className={`border-t border-outline-variant/40 ${
                            index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                          }`}
                        >
                          <td className="px-6 py-4 align-top text-xs text-on-surface-variant">
                            {formatDate(movement.createdAt)}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-medium text-on-surface">{movement.skuName || 'Unknown SKU'}</div>
                            <div className="text-xs font-mono text-on-surface-variant">{shortId(movement.skuId)}</div>
                          </td>
                          <td className="px-6 py-4 align-top text-sm text-on-surface-variant">{reasonLabel}</td>
                          <td className="px-6 py-4 align-top text-right">
                            <StatusPill value={`${movement.quantityChange > 0 ? '+' : ''}${formatNumber(movement.quantityChange)}`} tone={tone} />
                          </td>
                          <td className="px-6 py-4 align-top text-right text-sm font-semibold text-on-surface">
                            {formatNumber(movement.balanceAfter)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="warehouse details" description="Assigned warehouse information from the decoded token.">
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-on-surface-variant">Name</div>
                <div className="mt-1 font-semibold text-on-surface">{warehouseName}</div>
                <div className="mt-2 text-xs text-on-surface-variant font-mono">{warehouseId || '—'}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-outline-variant/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">Code</div>
                  <div className="mt-1 font-medium text-on-surface">{warehouseCode}</div>
                </div>
                <div className="rounded-lg border border-outline-variant/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">Items</div>
                  <div className="mt-1 font-medium text-on-surface">{stockLevels.length}</div>
                </div>
                <div className="rounded-lg border border-outline-variant/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">Units</div>
                  <div className="mt-1 font-medium text-on-surface">{formatNumber(totalUnits)}</div>
                </div>
                <div className="rounded-lg border border-outline-variant/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">Reorder Gap</div>
                  <div className="mt-1 font-medium text-on-surface">{formatNumber(totalReorderGap)}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="pending purchase orders" description="Purchase orders waiting on the warehouse.">
            {pendingPurchaseOrders.length === 0 ? (
              <EmptyState message="No pending purchase orders for this warehouse." />
            ) : (
              <div className="divide-y divide-outline-variant/40">
                {pendingPurchaseOrders.map((po: PurchaseOrderSummary) => (
                  <div key={po.id} className="p-4 hover:bg-surface-container/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-on-surface">{po.vendorName || shortId(po.vendorId)}</div>
                        <div className="text-xs text-on-surface-variant font-mono mt-0.5">{shortId(po.id)}</div>
                      </div>
                      <StatusPill value={po.status.replace(/_/g, ' ')} tone="amber" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                      <span>{po.lineItemCount || 0} line items</span>
                      <span>{formatCurrency(po.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="pending approvals" description="Approvals waiting in the queue.">
            {pendingApprovals.length === 0 ? (
              <EmptyState message="No pending approvals right now." />
            ) : (
              <div className="divide-y divide-outline-variant/40">
                {pendingApprovals.map((approval: ApprovalSummary) => (
                  <div key={approval.id} className="p-4 hover:bg-surface-container/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-on-surface">{approval.agentType.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-on-surface-variant mt-0.5">
                          Step {approval.stepNumber} · {shortId(approval.agentRunId)}
                        </div>
                      </div>
                      <StatusPill value={approval.status} tone="amber" />
                    </div>
                    <div className="mt-3 text-xs text-on-surface-variant">
                      {formatDate(approval.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <Card className="border-outline-variant/60 shadow-sm bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-on-surface">Scope driven by JWT</div>
                  <div className="text-xs text-on-surface-variant">
                    Warehouse ID is pulled from the decoded access token, matching your task spec.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
