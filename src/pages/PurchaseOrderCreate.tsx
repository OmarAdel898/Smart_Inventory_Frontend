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
  const warehouseLocked = (role === 'warehouse_manager' || role === 'clerk') && !!warehouseIdFromJwt;

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
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#0066CC]" />
        <p className="font-medium text-gray-900">Loading purchase order form...</p>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-gray-900">Unable to load purchase order data</p>
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
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Create Purchase Order</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            Build a new order by selecting a vendor, assigning a warehouse, and adding SKU line items.
          </p>
        </div>

      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2">
            <Card className="border-gray-200">
              <CardHeader className="border-b border-gray-200 bg-white">
              <CardTitle className="text-xl text-gray-900">Order Details</CardTitle>
              <CardDescription>Select the vendor and warehouse before adding line items.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Vendor</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className={`w-full h-10 rounded-md border bg-white px-3 text-sm  outline-none focus:ring-1 focus:ring-ring ${fieldErrors.vendorId ? 'border-red-400 focus:ring-red-500' : 'border-gray-200'}`}
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
                <p className="text-xs text-gray-500">
                  {selectedVendor?.contactEmail || selectedVendor?.contactPhone || 'Choose the supplier for this order.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  Warehouse
                  {warehouseLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full font-bold bg-[#E6F4FF] px-2 py-0.5 text-[11px] font-semibold text-[#0066CC]">
                      <ShieldCheck className="h-3 w-3" />
                      auto-set
                    </span>
                  )}
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className={`w-full h-10 rounded-md border bg-white px-3 text-sm  outline-none focus:ring-1 focus:ring-ring disabled:bg-gray-50 disabled:text-gray-500 ${fieldErrors.warehouseId ? 'border-red-400 focus:ring-red-500' : 'border-gray-200'}`}
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
                <p className="text-xs text-gray-500">
                  {warehouseLocked && selectedWarehouse
                    ? `Auto-selected from your JWT: ${selectedWarehouse.name}`
                    : 'Choose the warehouse that will receive the order.'}
                </p>
              </div>
            </CardContent>
          </Card>
          </div>

          <div className="xl:col-span-1">
            <Card className="border-gray-200">
              <CardHeader className="border-b border-gray-200 bg-white">
                <CardTitle className="text-xl text-gray-900">Order Summary</CardTitle>
                <CardDescription>Quick view of the order before submission.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                {submitError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Vendor</span>
                    <span className="font-medium text-gray-900">{selectedVendor?.name || 'Not selected'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Warehouse</span>
                    <span className="font-medium text-gray-900">{selectedWarehouse?.name || 'Not selected'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium text-gray-900">{lineItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Estimated total</span>
                    <span className="text-lg font-semibold text-[#0066CC] font-mono">{formatCurrency(orderTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="w-full space-y-6">
          <Card className="border-gray-200  overflow-hidden">
            <CardHeader className="border-b border-gray-200 bg-white flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-gray-900">Line Items</CardTitle>
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
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        SKU
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Unit Price
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Line Total
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {lineItems.map((item, index) => {
                      const sku = skuMap.get(item.skuId) || null;
                      const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);

                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-gray-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-white'
                          }`}
                        >
                          <td className="px-6 py-4 align-top">
                            <select
                              value={item.skuId}
                              onChange={(e) => handleSkuChange(item.id, e.target.value)}
                              className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm  outline-none focus:ring-1 focus:ring-ring"
                              required
                            >
                              <option value="">Select SKU</option>
                              {skus.map((skuItem) => (
                                <option key={skuItem.id} value={skuItem.id}>
                                  {skuItem.sku} - {skuItem.name}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
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

                          <td className="px-6 py-4 align-top text-right text-sm font-semibold text-gray-900 font-mono">
                            {formatCurrency(lineTotal)}
                          </td>

                          <td className="px-6 py-4 align-top text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(item.id)}
                              disabled={lineItems.length === 1}
                              className="gap-2 text-gray-500 hover:text-red-600"
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
            <p className="text-xs text-gray-500">
              Review the vendor, warehouse, and all line item values before submitting the order.
            </p>
            <div className="flex items-center gap-3">
              <button type="button" variant="cancel" onClick={() => navigate('/purchase-orders')} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                Cancel
              </button>
              <Button type="submit" disabled={submitLoading} className="gap-2">
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                Create Purchase Order
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
