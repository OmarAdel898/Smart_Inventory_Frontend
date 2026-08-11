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
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/useCan';

type VendorTier = 'tier1' | 'tier2' | 'tier3';

type Vendor = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  tier: VendorTier;
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

const TIER_META: Record<VendorTier, { label: string; hint: string; badge: string }> = {
  tier1: { label: 'Tier 1', hint: 'Strategic — bulk orders only (min $1,000)', badge: 'bg-[#F0E6FF] text-[#6500E6]' },
  tier2: { label: 'Tier 2', hint: 'Standard', badge: 'bg-gray-100 text-gray-700' },
  tier3: { label: 'Tier 3', hint: 'Commodity — harder terms', badge: 'bg-amber-100 text-amber-800' },
};

function TierBadge({ tier }: { tier: VendorTier }) {
  const meta = TIER_META[tier] || TIER_META.tier2;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badge}`}
      title={meta.hint}
    >
      {meta.label}
    </span>
  );
}

function CellValue({ children }: { children: string | null }) {
  return <span className={children ? 'text-gray-900' : 'text-gray-500'}>{children || '\u2014'}</span>;
}

function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
      <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
        <Loader2 className="h-5 w-5 animate-spin text-[#0066CC]" />
      </div>
      <div className="text-center">
        <p className="font-medium text-gray-900">Loading vendors</p>
        <p className="text-sm">Fetching the latest vendor list from the inventory system.</p>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
        <Building2 className="h-5 w-5 text-[#0066CC]" />
      </div>
      <div className="text-center max-w-sm">
        <p className="font-medium text-gray-900">No vendors found</p>
        <p className="text-sm">
          There are no vendors in the system yet. Once vendors are added, they will appear here.
        </p>
      </div>
      <Button onClick={onAdd} className="mt-2 gap-2">
        <Plus className="h-4 w-4" />
        Add your first vendor
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4 text-gray-500">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div className="text-center max-w-md">
        <p className="font-medium text-gray-900">Unable to load vendors</p>
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

  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '', tier: 'tier2' as VendorTier });
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

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
    setForm({ name: '', contactEmail: '', contactPhone: '', tier: 'tier2' });
    setFormErrors({});
    setFormServerErr(null);
    setModal({ open: true, mode: 'create', id: null });
  };

  const openEditModal = (vendor: Vendor) => {
    setForm({
      name: vendor.name,
      contactEmail: vendor.contactEmail || '',
      contactPhone: vendor.contactPhone || '',
      tier: vendor.tier || 'tier2',
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
      tier: form.tier,
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
    `w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 outline-none transition-colors ${
      formErrors[field] ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'
    }`;

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.contactEmail && v.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const totalPages = Math.ceil(filteredVendors.length / pageSize);
  const paginatedVendors = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">View and monitor all supplier records.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadVendors(undefined, true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Vendor
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setSearchTerm('')}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 bg-white shadow-sm transition-all"
              title="Clear Filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-500" /> Filter
            </button>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search vendors..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-[260px] pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-[13px] font-medium text-gray-500">Loading vendors...</p>
          </div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-6 w-6 text-[#B30024]" />
            <p className="text-[13px] font-medium text-[#B30024]">{error}</p>
            <button onClick={() => loadVendors()} className="text-[13px] font-bold text-[#0066CC] hover:underline">Try again</button>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Building2 className="h-8 w-8 text-gray-300" />
            <p className="text-[13px] font-medium text-gray-500">No vendors found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Tier</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Contact Email</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Contact Phone</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap hidden md:table-cell">Updated At</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedVendors.map((vendor) => (
                  <tr 
                    key={vendor.id} 
                    onClick={() => openDetail(vendor)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#E6F4FF] text-[#0066CC] font-bold text-[13px] flex items-center justify-center shrink-0 shadow-sm">
                          {vendor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-gray-900 leading-tight truncate max-w-[200px]">{vendor.name}</span>
                          <span className="text-[12px] font-medium text-gray-500 leading-tight truncate max-w-[200px] mt-0.5">ID: {vendor.id.slice(0,8).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <TierBadge tier={vendor.tier} />
                    </td>
                    <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600">
                      {vendor.contactEmail || '\u2014'}
                    </td>
                    <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600">
                      {vendor.contactPhone || '\u2014'}
                    </td>
                    <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">
                      {formatDate(vendor.updatedAt)}
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDetail(vendor); }} 
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" 
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && filteredVendors.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/30 rounded-b-xl">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                    currentPage === i + 1 
                      ? 'bg-[#E6F4FF] text-[#0066CC]' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[480px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50-low">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#0066CC]" />
                {modal.mode === 'create' ? 'Add New Vendor' : 'Edit Vendor'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-900 p-1 rounded-lg">
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
                  <label htmlFor="vendor-name" className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
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
                  <label htmlFor="vendor-email" className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
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
                  <label htmlFor="vendor-tier" className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Tier
                  </label>
                  <select
                    id="vendor-tier"
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value as VendorTier })}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 outline-none transition-colors focus:ring-accent/20"
                  >
                    {(Object.keys(TIER_META) as VendorTier[]).map((t) => (
                      <option key={t} value={t}>
                        {TIER_META[t].label} — {TIER_META[t].hint}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500">
                    Tier drives negotiation caps and the bulk-order rule (Tier 1 requires min $1,000 orders).
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vendor-phone" className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
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

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50-low border-t border-gray-200">
                <button type="button" variant="cancel" onClick={closeModal} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  Cancel
                </button>
                <Button type="submit" disabled={formSubmitting} className="gap-2">
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
          <div className="w-full max-w-[520px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50-low">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#0066CC]" />
                Vendor Details
              </h2>
              <button onClick={() => setDetailVendor(null)} className="text-gray-500 hover:text-gray-900 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {detailLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0066CC]" />
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-sm text-gray-900 text-center">{detailError}</p>
                  <Button variant="outline" onClick={() => openDetail(detailVendor)}>
                    Try again
                  </Button>
                </div>
              ) : (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">{detailVendor.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Vendor ID</dt>
                    <dd className="mt-1 text-xs font-mono text-gray-500">{detailVendor.id}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tier</dt>
                    <dd className="mt-1.5">
                      <div className="flex items-center gap-2">
                        <TierBadge tier={detailVendor.tier} />
                        <span className="text-xs text-gray-500">{TIER_META[detailVendor.tier]?.hint}</span>
                      </div>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Contact Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <CellValue>{detailVendor.contactEmail}</CellValue>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Contact Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <CellValue>{detailVendor.contactPhone}</CellValue>
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Created At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(detailVendor.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Updated At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(detailVendor.updatedAt)}</dd>
                    </div>
                  </div>
                </dl>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50-low border-t border-gray-200">
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
          <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Vendor?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong className="text-gray-900">{deleteTarget.name}</strong>? This action
                cannot be undone and may affect SKUs aligned to this vendor.
              </p>

              {deleteError && (
                <div className="mb-4 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button variant="cancel" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  Cancel
                </button>
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