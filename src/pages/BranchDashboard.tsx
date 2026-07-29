import { useEffect, useState } from 'react';
import { fetchBranchDashboard } from '@/api/branchDashboard';
import type { DashboardData } from '@/api/branchDashboard';

const REASON_TYPE_MAP: Record<string, { label: string; icon: string; color: string; badge: { bg: string; text: string } }> = {
  purchase_order_receipt: { label: 'Inbound', icon: 'south_east', color: 'text-secondary', badge: { bg: 'bg-green-100', text: 'text-green-800' } },
  customer_return: { label: 'Inbound', icon: 'south_east', color: 'text-secondary', badge: { bg: 'bg-green-100', text: 'text-green-800' } },
  agent_reorder: { label: 'Inbound', icon: 'south_east', color: 'text-secondary', badge: { bg: 'bg-green-100', text: 'text-green-800' } },
  sale: { label: 'Outbound', icon: 'north_east', color: 'text-error', badge: { bg: 'bg-blue-100', text: 'text-blue-800' } },
  write_off: { label: 'Outbound', icon: 'north_east', color: 'text-error', badge: { bg: 'bg-blue-100', text: 'text-blue-800' } },
  supplier_return: { label: 'Outbound', icon: 'north_east', color: 'text-error', badge: { bg: 'bg-blue-100', text: 'text-blue-800' } },
  transfer_in: { label: 'Internal', icon: 'sync_alt', color: 'text-tertiary-container', badge: { bg: 'bg-green-100', text: 'text-green-800' } },
  transfer_out: { label: 'Internal', icon: 'sync_alt', color: 'text-tertiary-container', badge: { bg: 'bg-blue-100', text: 'text-blue-800' } },
  manual_adjustment: { label: 'Adjustment', icon: 'tune', color: 'text-[#F59E0B]', badge: { bg: 'bg-orange-100', text: 'text-orange-800' } },
};

function getReasonMapping(reason: string) {
  return REASON_TYPE_MAP[reason] || { label: reason, icon: 'swap_horiz', color: 'text-on-surface-variant', badge: { bg: 'bg-gray-100', text: 'text-gray-800' } };
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatNumber(n: number): string {
  return n.toLocaleString('en');
}

function getSkuDisplay(movement: { skuCode?: string | null; skuName?: string | null; skuId: string; note?: string | null }): { code: string; name: string } {
  const code = movement.skuCode || movement.skuId.substring(0, 8).toUpperCase();
  const name = movement.skuName || movement.note || movement.skuId;
  return { code, name };
}

export default function BranchDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const warehouseId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBranchDashboard(warehouseId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const lowStockItems = data?.lowStockItems || [];
  const categoryCount = new Set(lowStockItems.map((i) => i.skuName?.split(' ')[0] || '')).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-body-md">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-headline-lg text-on-surface mb-1">Operational Overview</h2>
        <p className="text-on-surface-variant text-body-md">Real-time status for North Distribution Hub (W12)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-lowest rounded-lg border border-outline-variant p-6 relative overflow-hidden group hover:border-error transition-colors duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-error" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-error/10 rounded-lg">
              <span className="material-symbols-outlined text-error">warning</span>
            </div>
            {lowStockItems.length > 0 && (
              <span className="text-error font-bold text-label-lg">{lowStockItems.length} items</span>
            )}
          </div>
          <p className="text-on-surface-variant text-label-lg font-bold uppercase tracking-wider mb-1">Low Stock</p>
          <h3 className="text-headline-lg text-on-background">{lowStockItems.length} Items</h3>
          <p className="text-body-sm text-on-surface-variant mt-2">
            {lowStockItems.length > 0
              ? `Critical threshold alerts in ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`
              : 'No low stock items'}
          </p>
        </div>

        <div className="bg-surface-lowest rounded-lg border border-outline-variant p-6 relative overflow-hidden group hover:border-tertiary-container transition-colors duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#F59E0B]" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-fixed/30 rounded-lg">
              <span className="material-symbols-outlined text-tertiary-container">pending_actions</span>
            </div>
            <span className="text-tertiary-container font-bold text-label-lg">
              {data && data.pendingPoCount > 0 ? `${data.pendingPoCount} pending` : 'All clear'}
            </span>
          </div>
          <p className="text-on-surface-variant text-label-lg font-bold uppercase tracking-wider mb-1">Pending POs</p>
          <h3 className="text-headline-lg text-on-background">{data?.pendingPoCount || 0} Orders</h3>
          <p className="text-body-sm text-on-surface-variant mt-2">Awaiting branch manager confirmation</p>
        </div>

        <div className="bg-surface-lowest rounded-lg border border-outline-variant p-6 relative overflow-hidden group hover:border-secondary transition-colors duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-secondary" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <span className="material-symbols-outlined text-secondary">conveyor_belt</span>
            </div>
            <span className="text-secondary font-bold text-label-lg">
              {data && data.recentMovements.length > 0 ? `${data.recentMovements.length} events` : 'No data'}
            </span>
          </div>
          <p className="text-on-surface-variant text-label-lg font-bold uppercase tracking-wider mb-1">Recent Movements</p>
          <h3 className="text-headline-lg text-on-background">{formatNumber(data?.totalUnits || 0)} Units</h3>
          <p className="text-body-sm text-on-surface-variant mt-2">Stock inbound/outbound (Last 24h)</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-surface-lowest rounded-lg border border-outline-variant">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-headline-sm text-on-surface">Recent Movements</h3>
                <p className="text-body-sm text-on-surface-variant">Live log from North Distribution Hub</p>
              </div>
              <button className="text-secondary text-label-lg font-bold hover:underline">View All Movements</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-3 text-label-lg font-bold text-on-surface-variant uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-label-lg font-bold text-on-surface-variant uppercase tracking-wider">SKU / Item</th>
                    <th className="px-6 py-3 text-label-lg font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-label-lg font-bold text-on-surface-variant uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-label-lg font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {data?.recentMovements.map((movement, i) => {
                    const mapping = getReasonMapping(movement.reason);
                    const display = getSkuDisplay(movement);
                    return (
                      <tr
                        key={movement.id || i}
                        className={`${i % 2 === 0 ? '' : 'bg-surface-container-low/30'} hover:bg-secondary/5 transition-colors group`}
                      >
                        <td className="px-6 py-3 font-mono-data text-[13px] text-on-surface">{formatTime(movement.createdAt)}</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="text-body-sm font-bold text-on-surface">{display.code}</span>
                            <span className="text-label-md text-on-surface-variant">{display.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`flex items-center gap-1.5 text-body-sm font-medium ${mapping.color}`}>
                            <span className="material-symbols-outlined text-[16px]">{mapping.icon}</span>
                            {mapping.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono-data text-[13px] font-bold">{formatNumber(Math.abs(movement.quantityChange))}</td>
                        <td className="px-6 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${mapping.badge.bg} ${mapping.badge.text}`}>
                            {movement.quantityChange > 0 ? 'Received' : 'Shipped'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!data?.recentMovements || data.recentMovements.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant text-body-sm">No recent movements</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-primary-container rounded-lg p-6 text-white shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <h4 className="text-headline-sm mb-4">Branch Load</h4>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold">{data ? Math.min(Math.round(((data.totalStockItems + data.lowStockCount) / 200) * 100), 100) : 0}%</span>
                <span className="text-secondary-fixed text-label-md mb-1 font-bold">
                  {data && (data.totalStockItems + data.lowStockCount) > 160 ? 'High Capacity' : data && (data.totalStockItems + data.lowStockCount) > 80 ? 'Moderate' : 'Low Load'}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mb-6">
                <div
                  className="bg-secondary-fixed h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data ? Math.min(Math.round(((data.totalStockItems + data.lowStockCount) / 200) * 100), 100) : 0}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-on-primary-container text-label-md uppercase">Active Staff</p>
                  <p className="text-body-lg font-bold">14 / 16</p>
                </div>
                <div>
                  <p className="text-on-primary-container text-label-md uppercase">Bay Usage</p>
                  <p className="text-body-lg font-bold">06 / 08</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 opacity-10">
              <span className="material-symbols-outlined text-[160px]">warehouse</span>
            </div>
          </div>

          <div className="bg-surface-lowest rounded-lg border border-outline-variant p-6">
            <h4 className="text-headline-sm text-on-surface mb-4">Quick Actions</h4>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-all text-left w-full">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">add_box</span>
                  <div>
                    <p className="text-body-sm font-bold text-on-surface">New Internal Requisition</p>
                    <p className="text-label-md text-on-surface-variant">Request stock from main hub</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
              <button className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-all text-left w-full">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-error">inventory</span>
                  <div>
                    <p className="text-body-sm font-bold text-on-surface">Emergency Stock Check</p>
                    <p className="text-label-md text-on-surface-variant">Initiate manual count for sector 12</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
              <button className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-all text-left w-full">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#F59E0B]">assignment_return</span>
                  <div>
                    <p className="text-body-sm font-bold text-on-surface">Return to Hub</p>
                    <p className="text-label-md text-on-surface-variant">Process damaged or overstock items</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
