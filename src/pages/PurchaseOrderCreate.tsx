import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requestJson } from '@/api/_shared';
import { getAccessTokenFromCookie, getRoleFromToken, getWarehouseIdFromToken } from '@/lib/auth';
import type { SkuResponse, VendorResponse } from '@/types';
import type { WarehouseResponse } from '@/api/inventory-types';
import { purchaseOrderSchema } from '@/features/purchasing/validations';

type LineItemRow = {
  id: string;
  skuId: string;
  quantity: string;
  unitPrice: string;
};

type PurchaseOrderPayload = {
  vendorId: string;
  warehouseId: string;
  lineItems: Array<{ skuId: string; quantity: number; unitPrice: number }>;
};

function newLineItem(): LineItemRow {
  return {
    id: crypto.randomUUID(),
    skuId: '',
    quantity: '1',
    unitPrice: '',
  };
}

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function PurchaseOrderCreate() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [skus, setSkus] = useState<SkuResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [lineItems, setLineItems] = useState<LineItemRow[]>([newLineItem()]);

  const token = getAccessTokenFromCookie();
  const role = getRoleFromToken(token);
  const warehouseIdFromJwt = getWarehouseIdFromToken(token);
  const warehouseLocked = (role === 'warehouse_manager' || role === 'branch_manager') && !!warehouseIdFromJwt;

  const skuMap = useMemo(() => new Map(skus.map((sku) => [sku.id, sku])), [skus]);
  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) || null,
    [vendors, selectedVendorId],
  );
  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) || null,
    [warehouses, selectedWarehouseId],
  );

  const orderTotal = useMemo(
    () =>
      lineItems.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        return sum + quantity * unitPrice;
      }, 0),
    [lineItems],
  );

  const loadFormData = async () => {
    setLoading(true);
    setLoadingError(null);

    try {
      const [vendorsRes, warehousesRes, skusRes] = await Promise.all([
        requestJson<unknown>('/vendors'),
        requestJson<unknown>('/warehouses'),
        requestJson<unknown>('/sku'),
      ]);

      setVendors(normalizeList<VendorResponse>(vendorsRes));
      setWarehouses(normalizeList<WarehouseResponse>(warehousesRes));
      setSkus(normalizeList<SkuResponse>(skusRes));
      if (warehouseLocked && warehouseIdFromJwt) {
        setSelectedWarehouseId(warehouseIdFromJwt);
      }
    } catch (err) {
      setLoadingError(err instanceof Error ? err.message : 'Failed to load purchase order data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (warehouseLocked && warehouseIdFromJwt) {
      setSelectedWarehouseId(warehouseIdFromJwt);
    }
  }, [warehouseLocked, warehouseIdFromJwt]);

  const addLineItem = () => setLineItems((prev) => [...prev, newLineItem()]);
  const removeLineItem = (id: string) =>
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  const updateLineItem = (id: string, patch: Partial<LineItemRow>) =>
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const retry = () => {
    setSelectedVendorId('');
    if (!warehouseLocked) setSelectedWarehouseId('');
    setLineItems([newLineItem()]);
    void loadFormData();
  };

  const handleSkuChange = (rowId: string, skuId: string) => {
    const selectedSku = skuMap.get(skuId);
    updateLineItem(rowId, {
      skuId,
      unitPrice: selectedSku ? selectedSku.price.toFixed(2) : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const payload: PurchaseOrderPayload = {
      vendorId: selectedVendorId,
      warehouseId: selectedWarehouseId,
      lineItems: lineItems.map((item) => ({
        skuId: item.skuId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };

    const parsed = purchaseOrderSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      let hasLineItemError = false;
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        if (field === 'lineItems') {
          hasLineItemError = true;
        } else if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      if (hasLineItemError) {
        setSubmitError(parsed.error.issues[0]?.message || 'Please fix line item errors.');
      } else if (Object.keys(errors).length === 0) {
        setSubmitError(parsed.error.issues[0]?.message || 'Please complete all required fields.');
      }
      return;
    }

    setSubmitLoading(true);
    try {
      const created = await requestJson<{ id?: string; data?: { id?: string } }>('/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const createdId = created?.data?.id || created?.id;
      navigate(createdId ? `/purchase-orders/${createdId}` : '/purchase-orders');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create purchase order.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="font-medium text-on-surface">Loading purchase order form...</p>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-on-surface">Unable to load purchase order data</p>
          <p className="text-sm">{loadingError}</p>
        </div>
        <Button variant="outline" onClick={retry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/purchase-orders')} className="-ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm font-medium text-accent">Procurement Lifecycle</p>
              <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Create Purchase Order</h1>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant max-w-2xl">
            Build a new order by selecting a vendor, assigning a warehouse, and adding SKU line items.
          </p>
        </div>

        <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Package className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Line Items</p>
            <p className="text-base font-semibold text-on-surface">
              {lineItems.length} line item{lineItems.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_360px] gap-6 items-start">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-outline-variant/60 shadow-sm">
            <CardHeader className="border-b border-outline-variant/50 bg-surface">
              <CardTitle className="text-xl text-on-surface">Order Details</CardTitle>
              <CardDescription>Select the vendor and warehouse before adding line items.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Vendor</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className={`w-full h-10 rounded-md border bg-surface px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring ${fieldErrors.vendorId ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant'}`}
                  required
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.vendorId && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.vendorId}</p>}
                <p className="text-xs text-on-surface-variant">
                  {selectedVendor?.contactEmail || selectedVendor?.contactPhone || 'Choose the supplier for this order.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface flex items-center gap-2">
                  Warehouse
                  {warehouseLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      <ShieldCheck className="h-3 w-3" />
                      auto-set
                    </span>
                  )}
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className={`w-full h-10 rounded-md border bg-surface px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring disabled:bg-surface-container disabled:text-on-surface-variant ${fieldErrors.warehouseId ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant'}`}
                  required
                  disabled={warehouseLocked}
                >
                  <option value="">Select a warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                      {warehouse.location ? ` (${warehouse.location})` : ''}
                    </option>
                  ))}
                </select>
                {fieldErrors.warehouseId && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.warehouseId}</p>}
                <p className="text-xs text-on-surface-variant">
                  {warehouseLocked && selectedWarehouse
                    ? `Auto-selected from your JWT: ${selectedWarehouse.name}`
                    : 'Choose the warehouse that will receive the order.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-outline-variant/60 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-outline-variant/50 bg-surface flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-on-surface">Line Items</CardTitle>
                <CardDescription>Add one or more SKU rows to build the order.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addLineItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Add row
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-surface-container/70">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                        SKU
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                        Unit Price
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                        Line Total
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface">
                    {lineItems.map((item, index) => {
                      const sku = skuMap.get(item.skuId) || null;
                      const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);

                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-outline-variant/40 ${
                            index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                          }`}
                        >
                          <td className="px-6 py-4 align-top">
                            <select
                              value={item.skuId}
                              onChange={(e) => handleSkuChange(item.id, e.target.value)}
                              className="w-full h-10 rounded-md border border-outline-variant bg-surface px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                              required
                            >
                              <option value="">Select SKU</option>
                              {skus.map((skuItem) => (
                                <option key={skuItem.id} value={skuItem.id}>
                                  {skuItem.sku} - {skuItem.name}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {sku ? `${sku.sku} · ${sku.name}` : 'Pick a product from the catalog.'}
                            </p>
                          </td>

                          <td className="px-6 py-4 align-top">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, { quantity: e.target.value })}
                              className="text-right"
                              required
                            />
                          </td>

                          <td className="px-6 py-4 align-top">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(item.id, { unitPrice: e.target.value })}
                              className="text-right font-mono"
                              required
                            />
                          </td>

                          <td className="px-6 py-4 align-top text-right text-sm font-semibold text-on-surface font-mono">
                            {formatCurrency(lineTotal)}
                          </td>

                          <td className="px-6 py-4 align-top text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(item.id)}
                              disabled={lineItems.length === 1}
                              className="gap-2 text-on-surface-variant hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-on-surface-variant">
              Review the vendor, warehouse, and all line item values before submitting the order.
            </p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/purchase-orders')}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitLoading} className="gap-2 bg-primary text-white hover:bg-primary/90">
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                Create Purchase Order
              </Button>
            </div>
          </div>
        </form>

        <Card className="border-outline-variant/60 shadow-sm sticky top-6">
          <CardHeader className="border-b border-outline-variant/50 bg-surface">
            <CardTitle className="text-xl text-on-surface">Order Summary</CardTitle>
            <CardDescription>Quick view of the order before submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {submitError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Vendor</span>
                <span className="font-medium text-on-surface">{selectedVendor?.name || 'Not selected'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Warehouse</span>
                <span className="font-medium text-on-surface">{selectedWarehouse?.name || 'Not selected'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Items</span>
                <span className="font-medium text-on-surface">{lineItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Estimated total</span>
                <span className="text-lg font-semibold text-accent font-mono">{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/60 bg-accent/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Shared auth utils in use
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                The request uses the token cookie and role-aware warehouse decoding from the shared auth helper.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 text-xs text-on-surface-variant">
              <div className="font-semibold uppercase tracking-[0.12em] text-[11px] text-on-surface mb-2">
                Loaded data
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Vendors</span>
                <span className="font-medium text-on-surface">{vendors.length}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Warehouses</span>
                <span className="font-medium text-on-surface">{warehouses.length}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>SKUs</span>
                <span className="font-medium text-on-surface">{skus.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
