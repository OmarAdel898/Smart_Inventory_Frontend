import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Edit2,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Box,
  Upload,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/useCan';
import { skuSchema } from '@/features/inventory/validations';

export type SkuItem = {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  cost: number;
  price: number;
  preferredVendorId: string | null;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = 'http://localhost:3000';

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function Inventory() {
  const { can } = usePermissions();
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SkuItem | null>(null);
  const [deletingSku, setDeletingSku] = useState<SkuItem | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Forms
  const [skuForm, setSkuForm] = useState({
    sku: '',
    name: '',
    categoryId: '',
    cost: 0,
    price: 0,
    preferredVendorId: '',
  });

  const loadSkus = async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/sku`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to load SKUs (${res.status})`);
      }

      const body = await res.json();
      const list = body?.success === true ? body.data : Array.isArray(body) ? body : [];
      setSkus(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong loading SKUs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRelations = async (signal?: AbortSignal) => {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const [catRes, venRes] = await Promise.all([
        fetch(`${API_BASE}/categories`, { headers, signal }),
        fetch(`${API_BASE}/vendors`, { headers, signal })
      ]);
      if (catRes.ok) {
        const catBody = await catRes.json();
        setCategories(catBody?.data || (Array.isArray(catBody) ? catBody : []));
      }
      if (venRes.ok) {
        const venBody = await venRes.json();
        setVendors(venBody?.data || (Array.isArray(venBody) ? venBody : []));
      }
    } catch (e) {
      console.error('Failed to load relations', e);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadSkus(controller.signal);
    void loadRelations(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredSkus = useMemo(() => {
    return skus.filter((s) => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return s.name.toLowerCase().includes(lower) || s.sku.toLowerCase().includes(lower);
    });
  }, [skus, searchTerm]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const token = getToken();
      const payload = {
        sku: skuForm.sku,
        name: skuForm.name,
        categoryId: skuForm.categoryId || undefined,
        cost: Number(skuForm.cost),
        price: Number(skuForm.price),
        preferredVendorId: skuForm.preferredVendorId || undefined,
      };

      const parsed = skuSchema.safeParse(payload);
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = String(issue.path[0]);
          if (!errors[field]) errors[field] = issue.message;
        }
        setFieldErrors(errors);
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE}/sku`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to create SKU (${res.status})`);
      }

      setIsCreateOpen(false);
      setSkuForm({ sku: '', name: '', categoryId: '', cost: 0, price: 0, preferredVendorId: '' });
      await loadSkus(undefined, true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creating SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSku) return;
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const token = getToken();
      const payload = {
        sku: skuForm.sku,
        name: skuForm.name,
        categoryId: skuForm.categoryId || undefined,
        cost: Number(skuForm.cost),
        price: Number(skuForm.price),
        preferredVendorId: skuForm.preferredVendorId || undefined,
      };

      const parsed = skuSchema.safeParse(payload);
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = String(issue.path[0]);
          if (!errors[field]) errors[field] = issue.message;
        }
        setFieldErrors(errors);
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE}/sku/${editingSku.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to update SKU (${res.status})`);
      }

      setEditingSku(null);
      await loadSkus(undefined, true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error updating SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSku) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/sku/${deletingSku.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to delete SKU (${res.status})`);
      }

      setDeletingSku(null);
      await loadSkus(undefined, true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error deleting SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (sku: SkuItem) => {
    setEditingSku(sku);
    setSkuForm({
      sku: sku.sku,
      name: sku.name,
      categoryId: sku.categoryId || '',
      cost: sku.cost,
      price: sku.price,
      preferredVendorId: sku.preferredVendorId || '',
    });
    setFormError(null);
    setFieldErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Catalog</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">SKU Inventory</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage product catalog, pricing, and master data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-2.5 shadow-sm">
            <Box className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-on-surface">{skus.length} Items</span>
          </div>
          <Button
            variant="outline"
            onClick={() => loadSkus(undefined, true)}
            disabled={loading || refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {can('inventory.manage') && (
            <Button onClick={() => {
              setIsCreateOpen(true);
              setSkuForm({ sku: '', name: '', categoryId: '', cost: 0, price: 0, preferredVendorId: '' });
              setFormError(null);
              setFieldErrors({});
            }} className="gap-2 bg-primary text-white hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add SKU
            </Button>
          )}
        </div>
      </div>

      <Card className="border-outline-variant/60 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by SKU code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">SKU Directory</CardTitle>
          <CardDescription>
            Showing {filteredSkus.length} of {skus.length} catalog items
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="font-medium text-on-surface">Loading SKUs...</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-on-surface">{error}</p>
              <Button variant="outline" onClick={() => loadSkus()}>
                Try again
              </Button>
            </div>
          ) : filteredSkus.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Box className="h-8 w-8 text-accent/50" />
              <p className="font-medium text-on-surface">No SKUs match your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container/70">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Item
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      SKU Code
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Category
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Cost
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Price
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Vendor
                    </th>
                    {can('inventory.manage') && (
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {filteredSkus.map((s, idx) => (
                    <tr
                      key={s.id}
                      className={`border-t border-outline-variant/40 transition-colors hover:bg-surface-container/40 group ${
                        idx % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                      }`}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-on-surface text-sm">{s.name}</div>
                      </td>
                      <td className="px-6 py-4 align-top text-xs font-mono text-on-surface">
                        {s.sku}
                      </td>
                      <td className="px-6 py-4 align-top text-xs text-on-surface-variant">
                        {s.categoryId ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-surface-container border border-outline-variant text-on-surface font-mono">
                            {s.categoryId.slice(0, 8)}…
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 align-top text-xs text-on-surface-variant">
                        {formatCurrency(s.cost)}
                      </td>
                      <td className="px-6 py-4 align-top text-xs text-on-surface font-medium">
                        {formatCurrency(s.price)}
                      </td>
                      <td className="px-6 py-4 align-top text-xs text-on-surface-variant">
                        {s.preferredVendorId ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-surface-container border border-outline-variant text-on-surface font-mono">
                            {s.preferredVendorId.slice(0, 8)}…
                          </span>
                        ) : '—'}
                      </td>
                      {can('inventory.manage') && (
                        <td className="px-6 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                              title="Edit SKU"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingSku(s);
                                setFormError(null);
                              }}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete SKU"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {(isCreateOpen || editingSku) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4 bg-surface-container-low">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                {isCreateOpen ? <Plus className="h-5 w-5 text-accent" /> : <Edit2 className="h-5 w-5 text-accent" />}
                {isCreateOpen ? 'Add New SKU' : `Edit SKU: ${editingSku?.sku}`}
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingSku(null);
                  setFieldErrors({});
                }}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SKU-12345"
                    value={skuForm.sku}
                    onChange={(e) => setSkuForm({ ...skuForm, sku: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg focus:ring-2 ${fieldErrors.sku ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant focus:ring-accent/20'}`}
                  />
                  {fieldErrors.sku && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.sku}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Product Name"
                    value={skuForm.name}
                    onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg focus:ring-2 ${fieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant focus:ring-accent/20'}`}
                  />
                  {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Cost *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={skuForm.cost}
                    onChange={(e) => setSkuForm({ ...skuForm, cost: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg focus:ring-2 ${fieldErrors.cost ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant focus:ring-accent/20'}`}
                  />
                  {fieldErrors.cost && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.cost}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={skuForm.price}
                    onChange={(e) => setSkuForm({ ...skuForm, price: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg focus:ring-2 ${fieldErrors.price ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant focus:ring-accent/20'}`}
                  />
                  {fieldErrors.price && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.price}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Category
                  </label>
                  <select
                    value={skuForm.categoryId}
                    onChange={(e) => setSkuForm({ ...skuForm, categoryId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg focus:ring-2 ${fieldErrors.categoryId ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant focus:ring-accent/20'}`}
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.categoryId && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.categoryId}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Preferred Vendor
                  </label>
                  <select
                    value={skuForm.preferredVendorId}
                    onChange={(e) => setSkuForm({ ...skuForm, preferredVendorId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg focus:ring-2 ${fieldErrors.preferredVendorId ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant focus:ring-accent/20'}`}
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.preferredVendorId && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.preferredVendorId}</p>}
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingSku(null);
                  setFieldErrors({});
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary text-white">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCreateOpen ? 'Add SKU' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">Delete SKU?</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Are you sure you want to delete <strong>{deletingSku.sku}</strong>? This action cannot be undone and may affect inventory tracking.
              </p>
              
              {formError && (
                <div className="mb-4 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => {
                  setDeletingSku(null);
                  setFormError(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteConfirm} 
                  disabled={isSubmitting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
