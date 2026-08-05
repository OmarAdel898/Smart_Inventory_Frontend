import { useEffect, useMemo, useState } from 'react';
import { getAccessTokenFromCookie } from '@/lib/auth';
import { usePermissions } from '@/hooks/useCan';

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
  purchase_order_receipt: { label: 'PO Receipt', bg: 'bg-tertiary-container/20', text: 'text-on-tertiary-container' },
  sale: { label: 'Sales Shipment', bg: 'bg-secondary-container/10', text: 'text-secondary' },
  manual_adjustment: { label: 'Adjustment', bg: 'bg-error-container/20', text: 'text-error' },
  transfer_in: { label: 'Transfer In', bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
  transfer_out: { label: 'Transfer Out', bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
};

function getReasonStyle(reason: string) {
  return REASON_STYLES[reason] || { label: reason.replace(/_/g, ' '), bg: 'bg-surface-container-high', text: 'text-on-surface-variant' };
}

export default function StockMovements() {
  const { can } = usePermissions();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [warehouseIdFilter, setWarehouseIdFilter] = useState<string>('');

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

  // Client-side filtering
  const filteredMovements = useMemo(() => {
    let result = movements;
    if (reasonFilter !== 'all') {
      result = result.filter(m => m.reason === reasonFilter);
    }
    return result;
  }, [movements, reasonFilter]);

  // Derived stats
  const stats = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;
    let net = 0;

    movements.forEach(m => {
      if (m.quantityChange > 0) incoming += m.quantityChange;
      if (m.quantityChange < 0) outgoing += Math.abs(m.quantityChange);
      net += m.quantityChange;
    });

    return { incoming, outgoing, net };
  }, [movements]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      
      {/* Header / Filter Bar Area */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between mb-2">
        <div>
           <h2 className="text-2xl font-bold text-on-surface whitespace-nowrap">Stock Movements</h2>
           <p className="text-sm text-on-surface-variant mt-1">Track and audit inventory changes across all locations</p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30 flex-1 max-w-2xl">
          <div className="flex items-center gap-2 border-r border-outline-variant/30 pr-3 flex-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">warehouse</span>
            <input 
              className="bg-transparent border-none text-sm font-medium focus:ring-0 w-full text-on-surface outline-none" 
              placeholder="Filter by Warehouse ID..."
              type="text" 
              value={warehouseIdFilter}
              onChange={(e) => setWarehouseIdFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">filter_list</span>
            <select 
              className="bg-transparent border-none text-sm focus:ring-0 w-full text-on-surface cursor-pointer outline-none"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="all">All Movement Reasons</option>
              <option value="purchase_order_receipt">Purchase Order Receipt</option>
              <option value="sale">Sales Shipment</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="manual_adjustment">Manual Adjustment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Dashboard (High-Density Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
        {/* Trend Card */}
        <div className="col-span-1 md:col-span-8 bg-surface-lowest border border-outline-variant/60 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Net Stock Movement</h3>
              <p className="text-3xl text-on-surface font-extrabold">
                {stats.net > 0 ? '+' : ''}{formatNumber(stats.net)} 
                <span className="text-sm font-medium text-secondary ml-2">units net change</span>
              </p>
            </div>
          </div>
          
          {/* Mini Sparkline Simulation */}
          <div className="h-24 w-full flex items-end gap-1 px-1 opacity-60">
            {/* Hardcoded sparkline to match the template's aesthetic since we don't have historical chart data yet */}
            <div className="flex-1 bg-secondary-container/30 hover:bg-secondary-container/50 transition-all rounded-t h-[40%]"></div>
            <div className="flex-1 bg-secondary-container/30 hover:bg-secondary-container/50 transition-all rounded-t h-[65%]"></div>
            <div className="flex-1 bg-secondary-container/30 hover:bg-secondary-container/50 transition-all rounded-t h-[30%]"></div>
            <div className="flex-1 bg-error-container hover:bg-error/30 transition-all rounded-t h-[15%]"></div>
            <div className="flex-1 bg-secondary-container/30 hover:bg-secondary-container/50 transition-all rounded-t h-[85%]"></div>
            <div className="flex-1 bg-secondary-container/30 hover:bg-secondary-container/50 transition-all rounded-t h-[55%]"></div>
            <div className="flex-1 bg-secondary-fixed hover:bg-secondary-fixed/80 transition-all rounded-t h-[100%]"></div>
          </div>
          
          <div className="flex justify-between mt-2 text-[11px] font-medium text-on-surface-variant border-t border-outline-variant/30 pt-2">
            <span>Historical</span>
            <span className="font-bold text-secondary">Present</span>
          </div>
        </div>

        {/* Stats Column */}
        <div className="col-span-1 md:col-span-4 grid grid-rows-2 gap-4">
          <div className="bg-surface-lowest border border-outline-variant/60 border-t-2 border-t-secondary rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Incoming Total</p>
              <p className="text-2xl text-secondary font-extrabold">
                {formatNumber(stats.incoming)} <span className="text-sm font-normal text-on-surface-variant">units</span>
              </p>
            </div>
            <span className="material-symbols-outlined text-secondary bg-secondary-container/30 p-2 rounded-lg text-3xl">south_east</span>
          </div>
          <div className="bg-surface-lowest border border-outline-variant/60 border-t-2 border-t-error rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Outgoing Total</p>
              <p className="text-2xl text-error font-extrabold">
                {formatNumber(stats.outgoing)} <span className="text-sm font-normal text-on-surface-variant">units</span>
              </p>
            </div>
            <span className="material-symbols-outlined text-error bg-error-container/40 p-2 rounded-lg text-3xl">north_east</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant/60 flex justify-between items-center bg-surface-lowest">
          <h4 className="text-lg text-on-surface font-bold">Movement Log</h4>
          <div className="flex gap-2">
            {can('movements.manage') && (
              <button 
                onClick={openModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Record Movement
              </button>
            )}
            <button 
              onClick={() => loadMovements()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-sm font-medium hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-20 text-center text-on-surface-variant flex flex-col items-center">
               <span className="material-symbols-outlined animate-spin text-3xl text-secondary mb-2">progress_activity</span>
               <p>Loading movements...</p>
             </div>
          ) : error ? (
            <div className="py-20 text-center text-error flex flex-col items-center">
              <span className="material-symbols-outlined text-3xl mb-2">error</span>
              <p>{error}</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
              <p>No stock movements found.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant/60 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Warehouse</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Change</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Balance After</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Note / User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredMovements.map((movement, idx) => {
                  const style = getReasonStyle(movement.reason);
                  const isEven = idx % 2 === 0;
                  return (
                    <tr 
                      key={movement.id}
                      className={`hover:bg-surface-container-low transition-colors duration-150 active:scale-[0.998] ${isEven ? 'bg-surface-bright' : 'bg-surface-lowest'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-mono text-[13px] text-on-surface">{formatDateToDay(movement.createdAt)}</p>
                        <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{formatDateToTime(movement.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-mono text-[13px] font-bold text-on-surface">{movement.skuName || movement.skuId.slice(0, 13)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-secondary"></span>
                          <span className="text-sm font-medium text-on-surface">{movement.warehouseName || movement.warehouseId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 ${style.bg} ${style.text} text-[11px] font-bold rounded uppercase whitespace-nowrap`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono text-[13px] font-bold ${movement.quantityChange > 0 ? 'text-secondary' : 'text-error'}`}>
                          {movement.quantityChange > 0 ? '+' : ''}{formatNumber(movement.quantityChange)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-[13px] text-on-surface font-medium">
                          {formatNumber(movement.balanceAfter)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           {movement.performedByUserId ? (
                             <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0">
                               U
                             </div>
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] text-on-surface-variant font-bold shrink-0">
                               SYS
                             </div>
                           )}
                          <p className="text-sm font-medium text-on-surface max-w-[200px] truncate" title={movement.note || 'System Auto'}>
                            {movement.note || 'System Auto'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Table Footer / Pagination */}
        {!loading && filteredMovements.length > 0 && (
          <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
            <span className="text-xs font-medium text-on-surface-variant">Showing {filteredMovements.length} movements</span>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-high text-on-surface disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white text-xs font-bold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-high text-on-surface disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-[500px] bg-surface-lowest border border-outline-variant rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-lowest rounded-t-xl shrink-0">
              <h3 className="text-lg font-bold text-on-surface">Record Movement</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleRecordMovement} className="p-6 overflow-y-auto flex-1 space-y-4">
              {formError && (
                <div className="p-3 bg-error-container/20 border border-error/50 rounded-lg text-sm text-error font-medium">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">SKU</label>
                <select
                  required
                  value={formSkuId}
                  onChange={e => setFormSkuId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                >
                  <option value="" disabled>Select SKU...</option>
                  {skus.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Warehouse</label>
                <select
                  required
                  value={formWarehouseId}
                  onChange={e => setFormWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                >
                  <option value="" disabled>Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name || w.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Quantity Change</label>
                <input
                  type="number"
                  required
                  value={formQuantity}
                  onChange={e => setFormQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="-50 or 100"
                  className="w-full px-3 py-2 text-sm bg-surface-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Reason</label>
                <select
                  required
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
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
                <label className="block text-sm font-bold text-on-surface mb-1">Note (Optional)</label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="e.g. Customer order #123"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-surface-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20 outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg shadow-sm hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center gap-2"
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
