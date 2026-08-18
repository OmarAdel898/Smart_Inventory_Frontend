import { useEffect, useMemo, useState } from 'react';
import { getAccessTokenFromCookie } from '@/lib/auth';
import { usePermissions } from '@/hooks/useCan';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, RefreshCw, Plus, Loader2, AlertCircle, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';

export type StockMovement = {
  id: string;
  skuId: string;
  warehouseId: string;
  reason: string;
  quantityChange: number;
  balanceAfter: number;
  performedByUserId: string | null;
  note: string | null;
  createdAt: string;
  skuName?: string;
  warehouseName?: string;
};

const API_BASE = 'http://localhost:3000';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatDateToTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function formatDateToDay(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().split('T')[0];
}

const REASON_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  purchase_order_receipt: { label: 'PO Receipt', bg: 'bg-[#E6F4FF] border border-[#0066CC]/20 shadow-[0_0_8px_rgba(0,102,204,0.15)]', text: 'text-[#0066CC]' },
  sale: { label: 'Sales Shipment', bg: 'bg-[#F0E6FF] border border-[#6C5CE7]/20 shadow-[0_0_8px_rgba(108,92,231,0.15)]', text: 'text-[#6C5CE7]' },
  manual_adjustment: { label: 'Adjustment', bg: 'bg-[#FFD9DF] border border-[#B30024]/20 shadow-[0_0_8px_rgba(179,0,36,0.15)]', text: 'text-[#B30024]' },
  transfer_in: { label: 'Transfer In', bg: 'bg-[#E8F8F5] border border-[#0F766E]/20 shadow-[0_0_8px_rgba(15,118,110,0.15)]', text: 'text-[#0F766E]' },
  transfer_out: { label: 'Transfer Out', bg: 'bg-[#FFF48F] border border-[#998600]/20 shadow-[0_0_8px_rgba(153,134,0,0.15)]', text: 'text-[#998600]' },
};

function getReasonStyle(reason: string) {
  return REASON_STYLES[reason] || { label: reason.replace(/_/g, ' '), bg: 'bg-gray-100', text: 'text-gray-500' };
}

export default function StockMovements() {
  const { can } = usePermissions();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; username: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [warehouseIdFilter, setWarehouseIdFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [skus, setSkus] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formSkuId, setFormSkuId] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formQuantity, setFormQuantity] = useState<number | ''>('');
  const [formReason, setFormReason] = useState('sale');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = async () => {
    setIsModalOpen(true);
    setFormError(null);
    setFormSkuId('');
    setFormWarehouseId('');
    setFormQuantity('');
    setFormReason('sale');
    setFormNote('');
    try {
      const token = getAccessTokenFromCookie();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const [skusRes, whRes] = await Promise.all([
        fetch(`${API_BASE}/sku`, { headers }),
        fetch(`${API_BASE}/warehouses`, { headers })
      ]);
      if (skusRes.ok) {
        const d = await skusRes.json();
        setSkus(Array.isArray(d) ? d : d.data || []);
      }
      if (whRes.ok) {
        const d = await whRes.json();
        setWarehouses(Array.isArray(d) ? d : d.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formSkuId || !formWarehouseId || formQuantity === '') {
      setFormError('SKU, Warehouse, and Quantity are required.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = getAccessTokenFromCookie();
      const res = await fetch(`${API_BASE}/inventory/stock-movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          skuId: formSkuId,
          warehouseId: formWarehouseId,
          quantityChange: Number(formQuantity),
          reason: formReason,
          note: formNote || undefined
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Failed to record movement`);
      }

      setIsModalOpen(false);
      loadMovements();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadMovements = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessTokenFromCookie();
      const params = new URLSearchParams();
      if (warehouseIdFilter.trim()) {
        params.append('warehouseId', warehouseIdFilter.trim());
      }
      params.append('limit', '100');

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_BASE}/inventory/stock-movements${queryString}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.meta?.message || payload?.message || `Failed to fetch movements (${response.status})`);
      }

      const body = await response.json();
      const list = body?.success === true ? body.data : Array.isArray(body) ? body : [];
      setMovements(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong loading stock movements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadMovements(controller.signal);
    return () => controller.abort();
  }, [warehouseIdFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const loadUsers = async () => {
      try {
        const token = getAccessTokenFromCookie();
        const res = await fetch(`${API_BASE}/users`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (res.ok) {
          const body = await res.json();
          setUsers(body?.data || (Array.isArray(body) ? body : []));
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('Failed to load users', e);
      }
    };
    void loadUsers();
    return () => controller.abort();
  }, []);

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => { map[u.id] = u.name || u.username; });
    return map;
  }, [users]);

  // Client-side filtering
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchReason = reasonFilter === 'all' || m.reason === reasonFilter;
      const matchWarehouseId = warehouseIdFilter === '' || m.warehouseId.toLowerCase().includes(warehouseIdFilter.toLowerCase()) || (m.warehouseName && m.warehouseName.toLowerCase().includes(warehouseIdFilter.toLowerCase()));
      const matchSearch = searchTerm === '' || 
        (m.skuName && m.skuName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.skuId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.note && m.note.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchReason && matchWarehouseId && matchSearch;
    });
  }, [movements, reasonFilter, warehouseIdFilter, searchTerm]);

  // Derived stats
  const stats = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;
    let net = 0;
    filteredMovements.forEach(m => {
      net += m.quantityChange;
      if (m.quantityChange > 0) incoming += m.quantityChange;
      else outgoing += Math.abs(m.quantityChange);
    });
    return { incoming, outgoing, net };
  }, [filteredMovements]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize);
  const paginatedMovements = filteredMovements.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      
      {/* Header / Filter Bar Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between mb-2">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Stock Movements</h2>
           <p className="text-sm text-gray-500 mt-1">Track and audit inventory changes across all locations</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadMovements()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {can('movements.manage') && (
            <button 
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              Record Movement
            </button>
          )}
        </div>
      </div>

      {/* Summary Dashboard (Premium High-Density Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Net Stock Movement */}
        <div className="bg-gradient-to-br from-white to-[#F8FAFC] border border-gray-100 rounded-2xl p-6 flex flex-col justify-center shadow-sm">
          <div>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2">Net Stock Movement</h3>
            <p className="text-[36px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#0F766E] to-[#0284C7] leading-none">
              {stats.net > 0 ? '+' : ''}{formatNumber(stats.net)} 
              <span className="text-[14px] font-semibold text-gray-500 ml-3">units net</span>
            </p>
          </div>
        </div>

        {/* Incoming Card */}
        <div className="bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] border border-[#10B981]/20 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[12px] font-bold text-[#10B981]/70 uppercase tracking-widest mb-1">Incoming Total</p>
            <p className="text-[28px] font-black text-[#047857]">
              {formatNumber(stats.incoming)} <span className="text-[13px] font-semibold text-[#10B981]">units</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-white rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.2)] flex items-center justify-center text-[#10B981] shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
          
        {/* Outgoing Card */}
        <div className="bg-gradient-to-br from-[#FEF2F2] to-[#FFF1F2] border border-[#F43F5E]/20 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[12px] font-bold text-[#F43F5E]/70 uppercase tracking-widest mb-1">Outgoing Total</p>
            <p className="text-[28px] font-black text-[#BE123C]">
              {formatNumber(stats.outgoing)} <span className="text-[13px] font-semibold text-[#F43F5E]">units</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-white rounded-xl shadow-[0_4px_15px_rgba(244,63,94,0.2)] flex items-center justify-center text-[#F43F5E] shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] bg-white shadow-sm">
              <span className="material-symbols-outlined text-gray-400 text-[18px]">warehouse</span>
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
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] bg-white shadow-sm">
              <span className="material-symbols-outlined text-gray-400 text-[18px]">filter_list</span>
              <select 
                className="bg-transparent border-none p-0 focus:ring-0 w-[160px] text-gray-900 font-medium cursor-pointer outline-none"
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Reasons</option>
                <option value="purchase_order_receipt">PO Receipt</option>
                <option value="sale">Sales Shipment</option>
                <option value="transfer_in">Transfer In</option>
                <option value="transfer_out">Transfer Out</option>
                <option value="manual_adjustment">Adjustment</option>
              </select>
            </div>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search movements..." 
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
               <p className="text-[13px] font-medium text-gray-500">Loading movements...</p>
             </div>
          ) : error ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <AlertCircle className="h-6 w-6 text-[#B30024]" />
              <p className="text-[13px] font-medium text-[#B30024]">{error}</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">receipt_long</span>
              <p className="text-[13px] font-medium text-gray-500">No stock movements found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Timestamp</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">SKU</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Warehouse</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Reason</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Change</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Balance</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Note / User</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovements.map((movement) => {
                  const style = getReasonStyle(movement.reason);
                  return (
                    <tr 
                      key={movement.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <p className="text-[13px] font-bold text-gray-900">{formatDateToDay(movement.createdAt)}</p>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5">{formatDateToTime(movement.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <p className="text-[13px] font-bold text-gray-900">{movement.skuName || movement.skuId.slice(0, 13)}</p>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#0066CC]"></span>
                          <span className="text-[13px] font-medium text-gray-700">{movement.warehouseName || movement.warehouseId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`px-2 py-1 ${style.bg} ${style.text} text-[11px] font-bold rounded uppercase whitespace-nowrap`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <span className={`flex items-center justify-end gap-1 text-[13px] font-bold ${movement.quantityChange > 0 ? 'text-[#008A00]' : 'text-[#B30024]'}`}>
                          {movement.quantityChange > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {movement.quantityChange > 0 ? '+' : ''}{formatNumber(movement.quantityChange)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <span className="text-[13px] font-bold text-gray-900">
                          {formatNumber(movement.balanceAfter)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                           {movement.performedByUserId ? (
                             <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E6F4FF] to-[#0066CC]/20 text-[#0066CC] shadow-sm flex items-center justify-center font-bold text-[11px] shrink-0">
                               {(userMap[movement.performedByUserId] || 'U').charAt(0).toUpperCase()}
                             </div>
                           ) : (
                             <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0">
                               SYS
                             </div>
                           )}
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-900 truncate max-w-[200px]">
                              {movement.performedByUserId ? (userMap[movement.performedByUserId] || 'Unknown User') : 'System'}
                            </span>
                            <p className="text-[11px] font-medium text-gray-500 max-w-[200px] truncate" title={movement.note || (movement.performedByUserId ? 'No note' : 'System Auto')}>
                              {movement.note || (movement.performedByUserId ? 'No note' : 'System Auto')}
                            </p>
                          </div>
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
        {!loading && !error && filteredMovements.length > 0 && (
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Record Movement</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleRecordMovement} className="p-6 overflow-y-auto flex-1 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50/20 border border-error/50 rounded-lg text-sm text-red-600 font-medium">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">SKU</label>
                <select
                  required
                  value={formSkuId}
                  onChange={e => setFormSkuId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                >
                  <option value="" disabled>Select SKU...</option>
                  {skus.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Warehouse</label>
                <select
                  required
                  value={formWarehouseId}
                  onChange={e => setFormWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                >
                  <option value="" disabled>Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name || w.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Quantity Change</label>
                <input
                  type="number"
                  required
                  value={formQuantity}
                  onChange={e => setFormQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="-50 or 100"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Reason</label>
                <select
                  required
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                >
                  <option value="sale">Sale / Outgoing Order</option>
                  <option value="manual_adjustment">Manual Adjustment</option>
                  <option value="purchase_order_receipt">Purchase Order Receipt</option>
                  <option value="customer_return">Customer Return</option>
                  <option value="supplier_return">Supplier Return</option>
                  <option value="write_off">Write Off / Damage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Note (Optional)</label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="e.g. Customer order #123"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/20 outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50-low rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#E6F4FF] text-[#0066CC] hover:bg-[#D0E9FF] text-sm font-bold rounded-full shadow-sm hover:bg-[#D0E9FF] disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Saving...</>
                  ) : (
                    'Record'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
