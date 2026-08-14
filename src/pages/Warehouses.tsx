import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Ban,
  UserCheck,
  Trash2,
  Warehouse as WarehouseIcon,
  BarChart3,
  Star,
  Zap,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api/client';
import { warehouseApi, type Warehouse, type WarehouseSummary } from '@/api/warehouse.api';
import { getAccessTokenFromCookie, getWarehouseIdFromToken, getRoleFromToken } from '@/lib/auth';

function formatTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(d);
}

interface ActivityItem {
  id: string;
  title: string;
  sub: string;
  color: string;
}

const ACTIVITY_LABELS: Record<string, string> = {
  purchase_order_receipt: 'Stock In',
  customer_return: 'Return In',
  agent_reorder: 'Agent Reorder',
  transfer_in: 'Transfer In',
  sale: 'Stock Out',
  supplier_return: 'Stock Out',
  transfer_out: 'Transfer Out',
  write_off: 'Write Off',
  manual_adjustment: 'Adjustment',
};

const ACTIVITY_COLORS: Record<string, string> = {
  purchase_order_receipt: 'bg-[#86EFAC]',
  customer_return: 'bg-[#86EFAC]',
  agent_reorder: 'bg-[#93C5FD]',
  transfer_in: 'bg-[#FDBA74]',
  sale: 'bg-[#FCA5A5]',
  supplier_return: 'bg-[#FCA5A5]',
  transfer_out: 'bg-[#FDBA74]',
  write_off: 'bg-[#FCA5A5]',
  manual_adjustment: 'bg-[#93C5FD]',
};

function toActivity(m: { id: string; skuName?: string | null; reason: string; quantityChange: number; createdAt: string }): ActivityItem {
  const label = ACTIVITY_LABELS[m.reason] || m.reason.replace(/_/g, ' ');
  const sku = m.skuName || 'SKU';
  return {
    id: m.id,
    title: `${label}: ${m.quantityChange > 0 ? '+' : ''}${m.quantityChange} ${sku}`,
    sub: m.createdAt ?? '—',
    color: ACTIVITY_COLORS[m.reason] || 'bg-[#93C5FD]',
  };
}

export default function Warehouses() {
  const navigate = useNavigate();
  const token = getAccessTokenFromCookie();
  const userRole = getRoleFromToken(token);
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; target: Warehouse | null }>({
    open: false, mode: 'create', target: null
  });
  const [form, setForm] = useState({ name: '', location: '', status: 'active' as 'active' | 'inactive', managerId: '', capacityUnits: '' });
  const [managers, setManagers] = useState<{id: string, name: string, warehouseId: string | null}[]>([]);
  const [formErrors, setFormErrors] = useState<{name?: string; location?: string}>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formServerErr, setFormServerErr] = useState<string | null>(null);

  const fetchManagers = async () => {
    try {
      const data = await api.get<any>('/users');
      const list = data?.success === true ? data.data : Array.isArray(data) ? data : [];
      const m = list.filter((u: any) => u.role === 'warehouse_manager');
      setManagers(m.map((u: any) => ({ id: u.id, name: u.name || u.email, warehouseId: u.warehouseId || null })));
    } catch (err) {
      console.error('Failed to load managers', err);
    }
  };

  useEffect(() => {
    void fetchManagers();
  }, []);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await warehouseApi.summary();
      setWarehouses(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selected) {
        setSelected(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadActivities = async (warehouseId: string) => {
    setActivitiesLoading(true);
    try {
      const data = await api.get<any>(`/inventory/stock-movements?warehouseId=${warehouseId}&limit=5`);
      const list = data?.success === true ? data.data : Array.isArray(data) ? data : [];
      setActivities(Array.isArray(list) ? list.map(toActivity) : []);
    } catch (err) {
      console.error('Failed to load recent activity', err);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    if (selected?.id) void loadActivities(selected.id);
  }, [selected?.id]);

  const openModal = (mode: 'create' | 'edit', target?: Warehouse) => {
    if (mode === 'edit' && target) {
      const currentManager = managers.find(m => m.warehouseId === target.id);
      setForm({
        name: target.name,
        location: target.location || '',
        status: target.status === 'inactive' ? 'inactive' : 'active',
        managerId: currentManager?.id || '',
        capacityUnits: target.capacityUnits != null ? String(target.capacityUnits) : '',
      });
      setModal({ open: true, mode, target });
    } else {
      setForm({ name: '', location: '', status: 'active', managerId: '', capacityUnits: '' });
      setModal({ open: true, mode: 'create', target: null });
    }
    setFormErrors({});
    setFormServerErr(null);
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'create', target: null });
    setForm({ name: '', location: '', status: 'active', managerId: '', capacityUnits: '' });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormServerErr(null);
    setFormLoading(true);

    try {
      const payload = {
        name: form.name,
        location: form.location,
        status: form.status,
        capacityUnits: form.capacityUnits.trim() === '' ? undefined : Number(form.capacityUnits),
      };

      let warehouseId = modal.target?.id;
      
      if (modal.mode === 'create') {
        const created = await warehouseApi.create(payload);
        warehouseId = created?.id;
        if (created && created.id) {
          const summary = { ...created, units: 0, stockValue: 0, targetValue: 0, coveragePct: 0, skuCount: 0, lowStockCount: 0, openOrderCount: 0, staffCount: 0 } as WarehouseSummary;
          setWarehouses(prev => [...prev, summary]);
          if (!selected) setSelected(summary);
        }
      } else if (modal.target) {
        const updated = await warehouseApi.update(modal.target.id, payload);
        if (updated && updated.id) {
          const prev = warehouses.find(w => w.id === updated.id);
          const summary = { ...prev, ...updated } as WarehouseSummary;
          setWarehouses(list => list.map(w => w.id === updated.id ? summary : w));
          if (selected?.id === updated.id) setSelected(summary);
        }
      }
      
      if (warehouseId) {
        const currentManager = managers.find(m => m.warehouseId === warehouseId);
        if (form.managerId !== (currentManager?.id || '')) {
          try {
            if (currentManager) {
              await api.patch(`/users/${currentManager.id}`, { warehouseId: null });
            }
            if (form.managerId) {
              await api.patch(`/users/${form.managerId}`, { warehouseId });
            }
            await fetchManagers();
          } catch (managerErr) {
            console.error("Manager assignment failed", managerErr);
          }
        }
      }

      closeModal();
    } catch (err) {
      setFormServerErr(err instanceof Error ? err.message : 'Failed to save warehouse.');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await warehouseApi.remove(deleteTarget.id);
      await load(true);
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to deactivate warehouse.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReactivate = async (w: Warehouse) => {
    try {
      await warehouseApi.update(w.id, { status: 'active' });
      await load(true);
      if (selected?.id === w.id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate warehouse.');
    }
  };

  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (w.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const itemsPerPage = 7;
  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
  const paginatedWarehouses = filteredWarehouses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-8 min-h-[calc(100vh-100px)]">
      {/* ── Left Sidebar (List) ─────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">Warehouses</h1>
          {['tenant'].includes(userRole || '') && (
            <button onClick={() => openModal('create')} className="p-1.5 bg-[#E6F4FF] text-[#0066CC] hover:bg-[#D0E9FF] rounded-full font-bold transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search warehouses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#0066CC]" />
          </div>
        ) : error ? (
          <div className="text-[13px] text-red-500 font-medium text-center py-10">{error}</div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {paginatedWarehouses.map(w => (
              <div 
                key={w.id}
                onClick={() => setSelected(w)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                  selected?.id === w.id 
                    ? 'bg-white border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)]' 
                    : 'border-transparent hover:bg-gray-50'
                } ${w.status === 'inactive' ? 'opacity-60 grayscale' : ''}`}
              >
                <div>
                  <div className={`text-[14px] font-bold leading-tight flex items-center gap-2 ${w.status === 'inactive' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {w.name}
                    {w.status === 'inactive' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#FFD9DF] text-[#B30024] rounded uppercase tracking-wider no-underline">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-500 flex items-center gap-1 mt-1 font-medium">
                    <MapPin className="w-3 h-3 text-gray-400" /> {w.location || 'No location'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-bold text-gray-900 leading-tight">
                    {w.units ?? 0}
                  </div>
                  <div className="text-[12px] font-medium text-gray-500">units</div>
                </div>
              </div>
            ))}
            {filteredWarehouses.length === 0 && (
              <div className="text-center py-10 text-[13px] text-gray-500 font-medium">
                No warehouses found.
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2 py-1 text-[12px] font-bold text-gray-600 hover:text-[#0066CC] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <div className="text-[12px] font-bold text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2 py-1 text-[12px] font-bold text-gray-600 hover:text-[#0066CC] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right Content Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {selected ? (
          <>
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[32px] font-bold text-gray-900 tracking-tight leading-none flex items-center gap-3">
                {selected.name}
                {selected.status === 'inactive' && (
                   <span className="text-[14px] font-bold px-3 py-1 bg-[#FFD9DF] text-[#B30024] rounded-full uppercase tracking-wider">
                     Inactive
                   </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal('edit', selected)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => load(true)} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Sync
                </button>
                {['tenant'].includes(userRole || '') && (
                  selected.status === 'active' ? (
                    <button 
                      onClick={() => setDeleteTarget(selected)} 
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-[#FFD9DF] rounded-lg text-[13px] font-bold text-[#B30024] hover:bg-[#FFD9DF] transition-all shadow-sm"
                    >
                      <Ban className="w-4 h-4" /> Deactivate
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleReactivate(selected)} 
                      className="flex items-center gap-2 px-3 py-2 bg-[#E6F4FF] border border-[#0066CC]/20 rounded-full text-[13px] font-bold text-[#0066CC] hover:bg-[#D0E9FF] transition-all shadow-sm"
                    >
                      <UserCheck className="w-4 h-4" /> Reactivate
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. Warehouse Info */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm col-span-1 md:col-span-2 lg:col-span-1 h-full flex flex-col justify-center">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4">Warehouse Info</h3>
                <div className="flex gap-5 items-center">
                  <div className="w-[64px] h-[64px] bg-[#F4F7FA] rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-8 h-8 text-[#0066CC]" />
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 flex-1">
                    <div>
                      <div className="text-[13px] font-medium text-gray-900 mb-0.5">Location</div>
                      <div className="text-[13px] text-gray-600 truncate" title={selected.location ?? undefined}>{selected.location || 'Not set'}</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-gray-900 mb-0.5">Manager</div>
                      <div className="text-[13px] text-gray-600 truncate">{managers.find(m => m.warehouseId === selected.id)?.name || 'Unassigned'}</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-gray-900 mb-0.5">Status</div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          selected.status === 'active' ? 'bg-[#E6F4FF] text-[#0066CC]' : 'bg-[#FFD9DF] text-[#B30024]'
                        }`}>
                          {selected.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-gray-900 mb-0.5">Main Hub</div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          selected.isMain ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selected.isMain ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Live Capacity */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col items-center justify-center h-full">
                <h3 className="text-[15px] font-bold text-gray-900 self-start mb-0">Live Capacity</h3>
                
                {(() => {
                  const summary = warehouses.find(w => w.id === selected.id);
                  const capacity = summary?.capacityUnits ?? null;
                  const units = summary?.units ?? 0;
                  const pct = capacity && capacity > 0 ? Math.min(100, Math.round((units / capacity) * 100)) : 0;
                  return (
                    <>
                      <div className="relative flex flex-col items-center justify-center mt-2 w-full max-w-[180px]">
                        <svg className="w-full h-auto drop-shadow-sm" viewBox="0 0 140 80">
                          <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#E5E7EB" strokeWidth="14" strokeLinecap="round" />
                          <path 
                            d="M 10 70 A 60 60 0 0 1 130 70" 
                            fill="none" 
                            stroke="#93C5FD" 
                            strokeWidth="14" 
                            strokeLinecap="round" 
                            strokeDasharray="188.5" 
                            strokeDashoffset={188.5 * (1 - pct / 100)} 
                            className="transition-all duration-1000 ease-out" 
                          />
                        </svg>
                        <div className="absolute top-[35%] flex flex-col items-center">
                          <div className="text-[28px] font-extrabold text-gray-900 leading-none">{pct}%</div>
                          <div className="text-[11px] font-medium text-gray-500 mt-0.5">
                            {capacity != null ? `${units.toLocaleString()} / ${capacity.toLocaleString()} Units` : 'No capacity set'}
                          </div>
                        </div>
                      </div>
                      <div className="text-[12px] font-medium text-gray-500 mt-1">
                        {capacity != null ? `Total Vol: ${capacity.toLocaleString()} Units` : 'Set capacity in Edit to enable this gauge'}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* 3. Recent Activity */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-[15px] font-bold text-gray-900 mb-6">Recent Activity</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[42px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-[90%] before:top-[5%] before:w-[1px] before:bg-gray-200">
                  {activitiesLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-[#0066CC]" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-10 text-[13px] font-medium text-gray-500">
                      No recent movements recorded for this warehouse.
                    </div>
                  ) : (
                    activities.map((a) => (
                      <div key={a.id} className="relative flex items-start gap-4 md:gap-6">
                        <div className="text-[11px] font-bold text-gray-400 w-12 text-right shrink-0 mt-1 hidden md:block">{formatTime(a.sub)}</div>
                        <div className={`w-2.5 h-2.5 rounded-full ${a.color} ring-4 ring-white z-10 mt-1.5 md:mx-auto shadow-sm`}></div>
                        <div className="flex-1 md:w-1/2">
                          <div className="text-[13px] font-semibold text-gray-900">{a.title}</div>
                          <div className="text-[11px] text-gray-500 font-medium">{formatTime(a.sub)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Key Metrics */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-full flex flex-col">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-center transition-colors hover:bg-gray-100">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Total SKUs</div>
                    <div className="text-[24px] font-extrabold text-gray-900 leading-none">
                      {warehouses.find(w => w.id === selected.id)?.skuCount ?? '—'}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-center transition-colors hover:bg-gray-100">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Open Orders</div>
                    <div className="text-[24px] font-extrabold text-gray-900 leading-none">
                      {warehouses.find(w => w.id === selected.id)?.openOrderCount ?? '—'}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-center transition-colors hover:bg-gray-100">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Low Stock Alerts</div>
                    <div className="text-[24px] font-extrabold text-gray-900 leading-none">
                      {warehouses.find(w => w.id === selected.id)?.lowStockCount ?? '—'}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-center transition-colors hover:bg-gray-100">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Staff On Shift</div>
                    <div className="text-[24px] font-extrabold text-gray-900 leading-none">
                      {warehouses.find(w => w.id === selected.id)?.staffCount ?? '—'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900">No Warehouse Selected</h3>
            <p className="text-[13px] text-gray-500 max-w-[280px] text-center mt-1">Select a warehouse from the list to view its dashboard, or create a new one.</p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FFD9DF] flex items-center justify-center text-[#B30024]">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-gray-900">Confirm Deactivation</h3>
                  <p className="text-[13px] font-medium text-gray-500">Irreversible action</p>
                </div>
              </div>
              <p className="text-[14px] text-gray-600 mb-6 leading-relaxed">
                Are you sure you want to deactivate <strong className="text-gray-900 font-bold">{deleteTarget.name}</strong>? This action cannot be undone and will deactivate all users assigned to this warehouse.
              </p>
              {deleteError && (
                <div className="flex items-start gap-2 rounded-lg border border-[#B30024]/20 bg-[#FFD9DF] px-3 py-2 text-[13px] font-medium text-[#B30024] mb-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
              <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-[#B30024] bg-[#FFD9DF] hover:bg-[#FFC2CB] transition-all disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Deactivate
                </button>
              </div>
            </div>
            {deleteLoading && (
              <div className="h-1 w-full bg-[#FFD9DF]">
                <div className="h-full bg-[#B30024] w-full animate-pulse" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <h2 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                {modal.mode === 'create' ? <Plus className="w-5 h-5 text-[#0066CC]" /> : <Pencil className="w-5 h-5 text-[#0066CC]" />}
                {modal.mode === 'create' ? 'Add New Warehouse' : 'Edit Warehouse'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-900 p-1 rounded-lg transition-colors"
              >
                <Ban className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              {formServerErr && (
                <div className="p-3 text-[13px] font-medium bg-[#FFD9DF] text-[#B30024] border border-[#B30024]/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formServerErr}
                </div>
              )}
              
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm({...form, location: e.target.value})}
                  className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Capacity (Units)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.capacityUnits}
                  onChange={e => setForm({...form, capacityUnits: e.target.value})}
                  placeholder="Total storage capacity in units"
                  className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value as 'active'|'inactive'})}
                    className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Assign Manager
                  </label>
                  <select
                    value={form.managerId}
                    onChange={e => setForm({...form, managerId: e.target.value})}
                    className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                  >
                    <option value="">No Manager Assigned</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[12px] font-medium text-gray-400 mt-1">Assign an existing Manager role to this warehouse.</p>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} disabled={formLoading} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] transition-all disabled:opacity-50">
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modal.mode === 'create' ? 'Add Warehouse' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
