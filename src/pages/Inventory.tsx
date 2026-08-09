import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  Edit2,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Box,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/useCan';
import { skuSchema } from '@/features/inventory/validations';
import { useCsvImport } from '@/features/inventory/hooks';
import { CsvImportModal } from '@/features/inventory/components/CsvImportModal';
import { ToastContainer } from '@/features/inventory/components/ToastContainer';
import { useToast } from '@/features/inventory/hooks/useToast';
import { skuApi } from '@/api/sku.api';
import { ApiError } from '@/api/client';

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
  const { toasts, showToast, dismissToast } = useToast();
  const csvImport = useCsvImport({
    showToast,
    onSuccessfulImport: () => void loadSkus(undefined, true),
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const getSkuStatus = (s: SkuItem) => {
    if (s.price > 500) return 'Active';
    if (s.price < 50) return 'Archived';
    return 'Draft';
  };

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SkuItem | null>(null);
  const [deletingSku, setDeletingSku] = useState<SkuItem | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Thresholds modal state
  const [thresholdSku, setThresholdSku] = useState<SkuItem | null>(null);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [loadingStockLevels, setLoadingStockLevels] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [selectedStockLevel, setSelectedStockLevel] = useState<any | null>(null);
  const [thresholdForm, setThresholdForm] = useState({
    reorderThreshold: 0,
    safetyStock: 0,
  });

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
      if (e instanceof DOMException && e.name === 'AbortError') return;
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
      const status = getSkuStatus(s);
      if (statusFilter !== 'All Status' && status !== statusFilter) return false;

      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return s.name.toLowerCase().includes(lower) || s.sku.toLowerCase().includes(lower);
    });
  }, [skus, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredSkus.length / itemsPerPage);
  const paginatedSkus = filteredSkus.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

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

  const openThresholdModal = async (sku: SkuItem) => {
    setThresholdSku(sku);
    setStockLevels([]);
    setSelectedStockLevel(null);
    setLoadingStockLevels(true);

    try {
      const token = getToken();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Fetch stock levels for this SKU
      let res = await fetch(`${API_BASE}/stock-levels?skuId=${sku.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error('Failed to load stock levels');

      let body = await res.json();
      let items = body.success && Array.isArray(body.data) ? body.data : Array.isArray(body.data?.items) ? body.data.items : [];

      // If no stock levels exist, auto-create them by recording a zero-qty adjustment per warehouse
      if (items.length === 0) {
        const whRes = await fetch(`${API_BASE}/warehouses`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (whRes.ok) {
          const whBody = await whRes.json();
          const warehouses = whBody?.data || (Array.isArray(whBody) ? whBody : []);

          for (const wh of warehouses) {
            // A zero-quantity movement auto-creates the stock level row in the backend
            await fetch(`${API_BASE}/inventory/stock-movements`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                skuId: sku.id,
                warehouseId: wh.id,
                quantityChange: 0,
                reason: 'manual_adjustment',
                note: 'Auto-initialized stock level for threshold configuration',
              }),
            });
          }

          // Re-fetch stock levels
          res = await fetch(`${API_BASE}/stock-levels?skuId=${sku.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (res.ok) {
            body = await res.json();
            items = body.success && Array.isArray(body.data) ? body.data : Array.isArray(body.data?.items) ? body.data.items : [];
          }
        }
      }

      setStockLevels(items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error loading stock levels', 'error');
      setStockLevels([]);
    } finally {
      setLoadingStockLevels(false);
    }
  };

  const handleSaveThreshold = async () => {
    if (!selectedStockLevel) return;
    setSavingThreshold(true);
    try {
      const token = getToken();
      const warehouseId = selectedStockLevel.warehouseId;
      const res = await fetch(`${API_BASE}/warehouses/${warehouseId}/stock-levels/${selectedStockLevel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reorderThreshold: Number(thresholdForm.reorderThreshold),
          safetyStock: Number(thresholdForm.safetyStock),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update thresholds');
      }
      
      setStockLevels((prev) => prev.map((sl) => 
        sl.id === selectedStockLevel.id 
          ? { ...sl, reorderThreshold: Number(thresholdForm.reorderThreshold), safetyStock: Number(thresholdForm.safetyStock) } 
          : sl
      ));
      setSelectedStockLevel(null);
      showToast('Thresholds updated successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error updating thresholds', 'error');
    } finally {
      setSavingThreshold(false);
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

  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await skuApi.exportCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `skus-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('SKU catalog exported successfully.', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to export SKUs.';
      showToast(msg, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const openImportModal = () => {
    csvImport.resetImportModal();
    setIsImportOpen(true);
  };

  const closeImportModal = () => {
    setIsImportOpen(false);
    csvImport.resetImportModal();
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[calc(100vh-4rem)] p-8 font-sans -m-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight tracking-tight">Product</h1>
          <p className="text-[15px] text-gray-500 mt-1">Manage product catalog, pricing, and master data.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadSkus(undefined, true)} disabled={loading || refreshing} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {can('inventory.manage') && (
            <button onClick={openImportModal} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all">
              <Upload className="w-4 h-4 text-gray-500" /> Import
            </button>
          )}
          <button onClick={handleExportCsv} disabled={isExporting || skus.length === 0} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-gray-600" />} Export
          </button>
          {can('inventory.manage') && (
            <button onClick={() => {
              setIsCreateOpen(true);
              setSkuForm({ sku: '', name: '', categoryId: '', cost: 0, price: 0, preferredVendorId: '' });
              setFormError(null);
              setFieldErrors({});
            }} className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all">
              <Plus className="w-4 h-4" /> New product
            </button>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setStatusFilter('All Status');
                setSearchTerm('');
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 bg-white shadow-sm transition-all"
              title="Clear Filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-500" /> Filter
            </button>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm outline-none transition-all cursor-pointer"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search...." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium w-[260px] outline-none focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-[13px] font-medium text-gray-500">Loading catalog...</p>
          </div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-6 w-6 text-[#B30024]" />
            <p className="text-[13px] font-medium text-[#B30024]">{error}</p>
            <button onClick={() => loadSkus(undefined, true)} className="text-[13px] font-bold text-[#0066CC] hover:underline">Try again</button>
          </div>
        ) : filteredSkus.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Box className="h-8 w-8 text-gray-300" />
            <p className="text-[13px] font-medium text-gray-500">No products found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Date Updated</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Warehouse</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Total Sales</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedSkus.map((s) => {
                  const statusLabel = getSkuStatus(s);
                  const statusInfo = 
                    statusLabel === 'Active' ? { bg: 'bg-[#E6F4FF]', text: 'text-[#0066CC]' } :
                    statusLabel === 'Draft' ? { bg: 'bg-[#FFF48F]', text: 'text-[#998600]' } :
                                      { bg: 'bg-[#FFD9DF]', text: 'text-[#B30024]' };

                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-gray-900">{s.name}</div>
                            <div className="text-[12px] text-gray-500 mt-0.5">{s.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600">
                        {new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600">
                        {Math.floor(s.cost)} in Stock
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-semibold text-gray-900">
                        {formatCurrency(s.price)}
                      </td>
                      <td className="px-6 py-4 align-middle text-right relative">
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 peer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {/* Hidden action menu that appears on hover next to 3 dots */}
                        {can('inventory.manage') && (
                          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity bg-white shadow-sm border border-gray-200 rounded-lg p-1 z-10">
                            <button onClick={() => openThresholdModal(s)} className="p-1.5 rounded text-gray-500 hover:bg-[#F0E6FF] hover:text-[#6500E6]" title="Set Thresholds">
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => openEditModal(s)} className="p-1.5 rounded text-gray-500 hover:bg-[#E6F4FF] hover:text-[#0066CC]" title="Edit SKU">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeletingSku(s)} className="p-1.5 rounded text-gray-500 hover:bg-[#FFD9DF] hover:text-[#B30024]" title="Delete SKU">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, idx) => (
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-[13px] font-semibold text-gray-400">...</span>
                ) : (
                  <button 
                    key={`page-${page}`}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors ${
                      currentPage === page 
                        ? 'bg-[#E6F4FF] text-[#0066CC] font-bold' 
                        : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>


      {/* CREATE / EDIT MODAL */}
      {(isCreateOpen || editingSku) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50-low">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {isCreateOpen ? <Plus className="h-5 w-5 text-[#0066CC]" /> : <Edit2 className="h-5 w-5 text-[#0066CC]" />}
                {isCreateOpen ? 'Add New SKU' : `Edit SKU: ${editingSku?.sku}`}
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingSku(null);
                  setFieldErrors({});
                }}
                className="text-gray-500 hover:text-gray-900 p-1 rounded-lg"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SKU-12345"
                    value={skuForm.sku}
                    onChange={(e) => setSkuForm({ ...skuForm, sku: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.sku ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.sku && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.sku}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Product Name"
                    value={skuForm.name}
                    onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Cost *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={skuForm.cost}
                    onChange={(e) => setSkuForm({ ...skuForm, cost: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.cost ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.cost && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.cost}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={skuForm.price}
                    onChange={(e) => setSkuForm({ ...skuForm, price: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.price ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.price && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.price}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Category
                  </label>
                  <select
                    value={skuForm.categoryId}
                    onChange={(e) => setSkuForm({ ...skuForm, categoryId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.categoryId ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Preferred Vendor
                  </label>
                  <select
                    value={skuForm.preferredVendorId}
                    onChange={(e) => setSkuForm({ ...skuForm, preferredVendorId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.preferredVendorId ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
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

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button variant="cancel" type="button" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingSku(null);
                  setFieldErrors({});
                }} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-[#E6F4FF] text-[#0066CC] hover:bg-[#D0E9FF]">
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
          <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete SKU?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong>{deletingSku.sku}</strong>? This action cannot be undone and may affect inventory tracking.
              </p>
              
              {formError && (
                <div className="mb-4 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button variant="cancel" onClick={() => {
                  setDeletingSku(null);
                  setFormError(null);
                }} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  Cancel
                </button>
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

      {/* THRESHOLDS MODAL */}
      {thresholdSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50-low">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#0066CC]" />
                Set Thresholds: {thresholdSku.sku}
              </h2>
              <button
                onClick={() => {
                  setThresholdSku(null);
                  setSelectedStockLevel(null);
                }}
                className="text-gray-500 hover:text-gray-900 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {loadingStockLevels ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0066CC]" />
                </div>
              ) : stockLevels.length === 0 ? (
                <p className="text-sm text-center text-gray-500 py-8">No stock levels found for this SKU.</p>
              ) : (
                <div className="space-y-4">
                  {stockLevels.map((sl) => (
                    <div key={sl.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          Warehouse: {sl.warehouse?.name || sl.warehouseName || sl.warehouseId.slice(0, 8)}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          Qty: {sl.quantity}
                        </span>
                      </div>
                      
                      {selectedStockLevel?.id === sl.id ? (
                        <div className="grid grid-cols-2 gap-4 mt-4 bg-white p-3 rounded-lg border border-gray-200">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                              Reorder Threshold
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={thresholdForm.reorderThreshold}
                              onChange={(e) => setThresholdForm({ ...thresholdForm, reorderThreshold: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                              Safety Stock
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={thresholdForm.safetyStock}
                              onChange={(e) => setThresholdForm({ ...thresholdForm, safetyStock: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/20"
                            />
                          </div>
                          <div className="col-span-2 flex justify-end gap-2 mt-2">
                            <button size="sm" variant="cancel" onClick={() => setSelectedStockLevel(null)} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                              Cancel
                            </button>
                            <Button size="sm" onClick={handleSaveThreshold} disabled={savingThreshold} className="bg-[#E6F4FF] text-[#0066CC] hover:bg-[#D0E9FF]">
                              {savingThreshold && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex gap-4 text-sm text-gray-500">
                            <div>Threshold: <span className="font-medium text-gray-900">{sl.reorderThreshold}</span></div>
                            <div>Safety: <span className="font-medium text-gray-900">{sl.safetyStock}</span></div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedStockLevel(sl);
                              setThresholdForm({
                                reorderThreshold: sl.reorderThreshold || 0,
                                safetyStock: sl.safetyStock || 0,
                              });
                            }}
                          >
                            Configure
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportOpen && (
        <CsvImportModal
          dragActive={csvImport.dragActive}
          csvFile={csvImport.csvFile}
          importProgress={csvImport.importProgress}
          importResult={csvImport.importResult}
          importErrorMsg={csvImport.importErrorMsg}
          fileInputRef={csvImport.fileInputRef}
          onDrag={csvImport.handleDrag}
          onDrop={csvImport.handleDrop}
          onFileChange={csvImport.handleFileChange}
          onUpload={() => void csvImport.handleCsvUpload()}
          onDownloadErrors={csvImport.downloadErrorReport}
          onClose={closeImportModal}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
