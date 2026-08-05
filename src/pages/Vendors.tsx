import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/useCan';

type Vendor = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = 'http://localhost:3000';

function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function authHeaders(): Record<string, string> {
  const token = getTokenFromCookie();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '\u2014';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function CellValue({ children }: { children: string | null }) {
  return <span className={children ? 'text-on-surface' : 'text-on-surface-variant'}>{children || '\u2014'}</span>;
}

function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
      <div className="text-center">
        <p className="font-medium text-on-surface">Loading vendors</p>
        <p className="text-sm">Fetching the latest vendor list from the inventory system.</p>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
        <Building2 className="h-5 w-5 text-accent" />
      </div>
      <div className="text-center max-w-sm">
        <p className="font-medium text-on-surface">No vendors found</p>
        <p className="text-sm">
          There are no vendors in the system yet. Once vendors are added, they will appear here.
        </p>
      </div>
      <Button onClick={onAdd} className="mt-2 gap-2 bg-primary text-white hover:bg-primary/90">
        <Plus className="h-4 w-4" />
        Add your first vendor
      </Button>
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
        <p className="font-medium text-on-surface">Unable to load vendors</p>
        <p className="text-sm">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

type ModalState = {
  open: boolean;
  mode: 'create' | 'edit';
  id: string | null;
};

export default function Vendors() {
  const { can } = usePermissions();
  const canManage = can('vendors.manage');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formServerErr, setFormServerErr] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create', id: null });

  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const vendorCountLabel = useMemo(() => {
    const count = vendors.length;
    return `${count} vendor${count === 1 ? '' : 's'}`;
  }, [vendors.length]);

  const loadVendors = async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/vendors`, {
        headers: authHeaders(),
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Failed to fetch vendors (${response.status})`);
      }

      const body = (await response.json()) as { success: boolean; data: Vendor[] };
      setVendors(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong while loading vendors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadVendors(controller.signal);
    return () => controller.abort();
  }, []);

  const openCreateModal = () => {
    setForm({ name: '', contactEmail: '', contactPhone: '' });
    setFormErrors({});
    setFormServerErr(null);
    setModal({ open: true, mode: 'create', id: null });
  };

  const openEditModal = (vendor: Vendor) => {
    setForm({
      name: vendor.name,
      contactEmail: vendor.contactEmail || '',
      contactPhone: vendor.contactPhone || '',
    });
    setFormErrors({});
    setFormServerErr(null);
    setDetailVendor(null);
    setModal({ open: true, mode: 'edit', id: vendor.id });
  };

  const closeModal = () => {
    if (!formSubmitting) {
      setModal({ open: false, mode: 'create', id: null });
      setFormErrors({});
      setFormServerErr(null);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!form.name.trim()) {
      errors.name = 'Vendor name is required';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Vendor name must be at least 2 characters';
    }
    if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      errors.contactEmail = 'Enter a valid email address';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setFormSubmitting(true);
    setFormServerErr(null);

    const payload = {
      name: form.name.trim(),
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
    };

    try {
      const url = modal.mode === 'edit' ? `${API_BASE}/vendors/${modal.id}` : `${API_BASE}/vendors`;
      const response = await fetch(url, {
        method: modal.mode === 'edit' ? 'PATCH' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to save vendor (${response.status})`);
      }

      setModal({ open: false, mode: 'create', id: null });
      setFormErrors({});
      setFormServerErr(null);
      await loadVendors();
    } catch (err) {
      setFormServerErr(err instanceof Error ? err.message : 'Something went wrong while saving the vendor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDetail = async (vendor: Vendor) => {
    setDetailVendor(vendor);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const response = await fetch(`${API_BASE}/vendors/${vendor.id}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Failed to load vendor (${response.status})`);
      }

      const body = (await response.json()) as { success: boolean; data: Vendor };
      if (body.data) {
        setDetailVendor(body.data);
        setVendors((prev) => prev.map((v) => (v.id === body.data.id ? { ...v, ...body.data } : v)));
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Something went wrong while loading vendor details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch(`${API_BASE}/vendors/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to delete vendor (${response.status})`);
      }

      setDeleteTarget(null);
      setDetailVendor(null);
      await loadVendors();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong while deleting the vendor.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2 text-sm bg-surface border rounded-lg focus:ring-2 outline-none transition-colors ${
      formErrors[field] ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant focus:ring-accent/20'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Vendor Management</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Vendors</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            View and monitor all supplier records in one clean, centralized table.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Total Vendors
              </p>
              <p className="text-base font-semibold text-on-surface">{vendorCountLabel}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => loadVendors(undefined, true)} disabled={loading || refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManage && (
            <Button onClick={openCreateModal} className="gap-2 bg-primary text-white hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">Vendor Directory</CardTitle>
          <CardDescription>
            Complete vendor list with contact information and audit timestamps. Click a row to view details.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadVendors()} />
          ) : vendors.length === 0 ? (
            <EmptyState onAdd={canManage ? openCreateModal : () => undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container/70">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Contact Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Contact Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Created At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Updated At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {vendors.map((vendor, index) => (
                    <tr
                      key={vendor.id}
                      onClick={() => openDetail(vendor)}
                      className={`border-t border-outline-variant/40 transition-colors cursor-pointer hover:bg-surface-container/40 ${
                        index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                      }`}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-on-surface">{vendor.name}</div>
                        <div className="mt-1 text-xs text-on-surface-variant">ID: {vendor.id}</div>
                      </td>
                      <td className="px-6 py-4 align-top text-sm">
                        <CellValue>{vendor.contactEmail}</CellValue>
                      </td>
                      <td className="px-6 py-4 align-top text-sm">
                        <CellValue>{vendor.contactPhone}</CellValue>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-on-surface-variant">
                        {formatDate(vendor.createdAt)}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-on-surface-variant">
                        {formatDate(vendor.updatedAt)}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(vendor);
                          }}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                          title="View vendor details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[480px] bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant/50 px-6 py-4 bg-surface-container-low">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                {modal.mode === 'create' ? 'Add New Vendor' : 'Edit Vendor'}
              </h2>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="p-6 space-y-4">
                {formServerErr && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formServerErr}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vendor-name" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="vendor-name"
                    type="text"
                    placeholder="e.g. Acme Supplies"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass('name')}
                    required
                  />
                  {formErrors.name && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.name}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vendor-email" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                    Contact Email
                  </label>
                  <input
                    id="vendor-email"
                    type="email"
                    placeholder="e.g. sales@acme.com"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className={inputClass('contactEmail')}
                  />
                  {formErrors.contactEmail && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.contactEmail}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vendor-phone" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                    Contact Phone
                  </label>
                  <input
                    id="vendor-phone"
                    type="tel"
                    placeholder="e.g. +20 100 000 0000"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className={inputClass('contactPhone')}
                  />
                  {formErrors.contactPhone && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.contactPhone}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-container-low border-t border-outline-variant/50">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formSubmitting} className="gap-2 bg-primary text-white hover:bg-primary/90">
                  {formSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {modal.mode === 'create' ? 'Create Vendor' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[520px] bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant/50 px-6 py-4 bg-surface-container-low">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                Vendor Details
              </h2>
              <button onClick={() => setDetailVendor(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {detailLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-sm text-on-surface text-center">{detailError}</p>
                  <Button variant="outline" onClick={() => openDetail(detailVendor)}>
                    Try again
                  </Button>
                </div>
              ) : (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Name</dt>
                    <dd className="mt-1 text-sm font-medium text-on-surface">{detailVendor.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Vendor ID</dt>
                    <dd className="mt-1 text-xs font-mono text-on-surface-variant">{detailVendor.id}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Contact Email</dt>
                    <dd className="mt-1 text-sm text-on-surface">
                      <CellValue>{detailVendor.contactEmail}</CellValue>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Contact Phone</dt>
                    <dd className="mt-1 text-sm text-on-surface">
                      <CellValue>{detailVendor.contactPhone}</CellValue>
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant/50">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Created At</dt>
                      <dd className="mt-1 text-sm text-on-surface">{formatDate(detailVendor.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Updated At</dt>
                      <dd className="mt-1 text-sm text-on-surface">{formatDate(detailVendor.updatedAt)}</dd>
                    </div>
                  </div>
                </dl>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-container-low border-t border-outline-variant/50">
              <Button variant="outline" onClick={() => setDetailVendor(null)}>
                Close
              </Button>
              {canManage && (
                <>
                  <Button variant="outline" onClick={() => openEditModal(detailVendor)} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setDeleteTarget(detailVendor)}
                    disabled={deleteLoading}
                    className="gap-2 bg-red-600 text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[400px] bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">Delete Vendor?</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Are you sure you want to delete <strong className="text-on-surface">{deleteTarget.name}</strong>? This action
                cannot be undone and may affect SKUs aligned to this vendor.
              </p>

              {deleteError && (
                <div className="mb-4 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="gap-2 bg-red-600 text-white hover:bg-red-700"
                >
                  {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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