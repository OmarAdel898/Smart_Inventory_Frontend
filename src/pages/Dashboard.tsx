import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/useCan';

type SKU = {
  id: string;
  skuCode?: string;
  name: string;
  currentQuantity?: number;
  reorderThreshold?: number;
};

const API_BASE = 'http://localhost:3000';

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchListSafe<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  try {
    const token = getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    });
    if (!res.ok) return [];
    const body = await res.json();
    if (body?.success === true && Array.isArray(body.data)) return body.data as T[];
    if (Array.isArray(body)) return body as T[];
    return [];
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return [];
  }
}



export default function Dashboard() {
  const { can } = usePermissions();
  const [skus, setSkus] = useState<SKU[]>([]);
  const [lowStockSkus, setLowStockSkus] = useState<SKU[]>([]);
  const [approvalCount, setApprovalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);

    try {
      const [allSkus, approvals] = await Promise.all([
        fetchListSafe<SKU>(`${API_BASE}/sku`, signal),
        fetchListSafe<{ id: string }>(`${API_BASE}/approvals`, signal),
      ]);

      setSkus(allSkus);
      setApprovalCount(approvals.length);

      // Derive low stock items if any SKU has currentQuantity <= reorderThreshold
      const lowStock = allSkus.filter(
        (s) =>
          typeof s.currentQuantity === 'number' &&
          typeof s.reorderThreshold === 'number' &&
          s.currentQuantity <= s.reorderThreshold
      );
      setLowStockSkus(lowStock);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
          <RefreshCw className="h-5 w-5 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  const totalSkus = skus.length;
  const lowStockCount = lowStockSkus.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-primary">Overview</h2>
          <p className="text-sm text-on-surface-variant mt-1">Real-time inventory intelligence and system status.</p>
        </div>
        <Button onClick={() => loadData()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Total SKUs</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">category</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-semibold text-primary">{totalSkus.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Low Stock Items</span>
            <span className="material-symbols-outlined text-destructive text-[20px]">warning</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-semibold text-primary">{lowStockCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Pending Approvals</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">pending_actions</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-semibold text-primary">{approvalCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">System Status</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-lg font-semibold text-emerald-700">Operational</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <h3 className="text-xl font-semibold text-primary">Low Stock Alerts</h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface">
                  <th className="text-[11px] font-semibold uppercase text-on-surface-variant px-6 h-8">Product</th>
                  <th className="text-[11px] font-semibold uppercase text-on-surface-variant px-4 h-8">Qty</th>
                  <th className="text-[11px] font-semibold uppercase text-on-surface-variant px-4 h-8">Threshold</th>
                  <th className="text-[11px] font-semibold uppercase text-on-surface-variant px-6 h-8 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface">
                {lowStockSkus.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-sm text-on-surface-variant text-center">
                      No low stock items detected.
                    </td>
                  </tr>
                ) : (
                  lowStockSkus.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-outline-variant h-10 hover:bg-surface-container-low transition-colors group"
                    >
                      <td className="px-6 font-medium text-primary">
                        {item.name}
                        {item.skuCode && (
                          <div className="text-[11px] text-on-surface-variant font-normal">{item.skuCode}</div>
                        )}
                      </td>
                      <td className="px-4 text-destructive font-semibold">{item.currentQuantity ?? 0}</td>
                      <td className="px-4 text-on-surface-variant">{item.reorderThreshold ?? 0}</td>
                      <td className="px-6 text-right">
                        {can('purchaseOrders.manage') && (
                          <button className="bg-surface-container-highest text-primary text-xs font-medium px-2.5 py-1 rounded border border-outline-variant hover:bg-outline-variant transition-colors">
                            Draft PO
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 h-full flex flex-col shadow-sm">
          <h3 className="text-xl font-semibold text-primary mb-4">Recent Agent Activity</h3>
          <div className="flex-1 flex flex-col gap-6 relative ml-1">
            <div className="absolute inset-y-0 left-[19px] w-px bg-outline-variant -z-10" />

            <div className="flex gap-4 relative">
              <div className="w-10 h-10 rounded-full bg-secondary-container border-2 border-surface-container-lowest flex items-center justify-center shrink-0 -mt-1">
                <span className="material-symbols-outlined text-on-secondary-container text-[20px]">smart_toy</span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm text-on-surface">
                  <span className="font-semibold text-primary">Agent Zeta</span> analyzed Vendor X pricing anomalies.
                </p>
                <span className="text-[11px] font-semibold text-on-surface-variant mt-1">2 mins ago</span>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="w-10 h-10 rounded-full bg-primary-fixed border-2 border-surface-container-lowest flex items-center justify-center shrink-0 -mt-1">
                <span className="material-symbols-outlined text-on-primary-fixed text-[20px]">description</span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm text-on-surface">
                  <span className="font-semibold text-primary">Agent Alpha</span> generated PO draft.
                </p>
                <span className="text-[11px] font-semibold text-on-surface-variant mt-1">15 mins ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
