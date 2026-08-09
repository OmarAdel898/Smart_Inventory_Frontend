import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  Eye,

  FileText,
  Filter,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Warehouse as WarehouseIcon,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  sent: { label: 'Sent', bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  received: { label: 'Received', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
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

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseIdFilter, setWarehouseIdFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadOrders = async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (warehouseIdFilter.trim()) {
        params.append('warehouseId', warehouseIdFilter.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_BASE}/purchase-orders${queryString}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Failed to fetch POs (${response.status})`);
      }

      const body = await response.json();
      const list = body?.success === true ? body.data : Array.isArray(body) ? body : [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong loading purchase orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, [statusFilter, warehouseIdFilter]);

  // Client-side search filtering
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const lower = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(lower) ||
        o.vendorId.toLowerCase().includes(lower) ||
        o.status.toLowerCase().includes(lower)
    );
  }, [orders, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Calculated KPI statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending_approval').length;
    const approved = orders.filter((o) => o.status === 'approved' || o.status === 'sent').length;
    const totalValue = orders.reduce((sum, o) => {
      return sum + o.lineItems.reduce((s, li) => s + Number(li.total || 0), 0);
    }, 0);
    return { total, pending, approved, totalValue };
  }, [orders]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between mb-2">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Orders</h2>
           <p className="text-sm text-gray-500 mt-1">Manage and track vendor purchase orders</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadOrders(undefined, true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => navigate('/purchase-orders/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* KPI Bento Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#FFF48F] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <FileText className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Total Orders</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-[#FFD9DF] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <Clock className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Pending Approval</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">{stats.pending}</span>
          </div>
        </div>

        <div className="bg-[#F0E6FF] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <Package className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Active / Approved</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">{stats.approved}</span>
          </div>
        </div>

        <div className="bg-[#E6F4FF] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black/5 rounded-full">
                <FileText className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Total Order Value</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] bg-white shadow-sm">
              <span className="text-gray-400 font-semibold">Status:</span>
              <select 
                className="bg-transparent border-none p-0 focus:ring-0 text-gray-900 font-medium cursor-pointer outline-none"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] bg-white shadow-sm">
              <WarehouseIcon className="h-4 w-4 text-gray-400" />
              <input 
                className="bg-transparent border-none p-0 focus:ring-0 w-[140px] text-gray-900 placeholder:text-gray-400 font-medium outline-none" 
                placeholder="Warehouse..."
                type="text" 
                value={warehouseIdFilter}
                onChange={(e) => {
                  setWarehouseIdFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {warehouseIdFilter && (
                <button onClick={() => { setWarehouseIdFilter(''); setCurrentPage(1); }} className="text-gray-400 hover:text-gray-900">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search ID or Vendor..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-[260px] pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <p className="text-[13px] font-medium text-gray-500">Loading purchase orders...</p>
            </div>
          ) : error ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <AlertCircle className="h-6 w-6 text-[#B30024]" />
              <p className="text-[13px] font-medium text-[#B30024]">{error}</p>
              <button onClick={() => loadOrders(undefined, true)} className="text-[13px] font-bold text-[#0066CC] hover:underline">Try again</button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-gray-300" />
              <p className="text-[13px] font-medium text-gray-500">No purchase orders found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">PO ID</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Vendor ID</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Items</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Total Amount</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap hidden md:table-cell">Created Date</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const style = getStatusStyle(order.status);
                  const totalVal = order.lineItems.reduce((sum, li) => sum + Number(li.total || 0), 0);
                  return (
                    <tr 
                      key={order.id}
                      onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-[#0066CC] group-hover:underline leading-tight truncate max-w-[120px]">{order.id.slice(0, 8)}</span>
                          <span className="text-[11px] font-medium text-gray-500 font-mono mt-0.5">{order.id.slice(0, 18)}…</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600 font-mono">
                        {order.vendorId.slice(0, 12)}…
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-[13px] font-bold text-gray-900">
                        {order.lineItems.length}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-[13px] font-bold text-gray-900 font-mono">
                        {formatCurrency(totalVal)}
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${order.id}`); }} 
                            className="p-1.5 rounded-full font-bold text-gray-400 hover:bg-[#E6F4FF] hover:text-[#0066CC] transition-colors" 
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Footer */}
        {!loading && !error && filteredOrders.length > 0 && (
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
    </div>
  );
}
