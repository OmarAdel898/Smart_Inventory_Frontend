import { useEffect, useState } from 'react';

type SKU = {
  id: string;
  skuCode: string;
  name: string;
  currentQuantity: number;
  reorderThreshold: number;
};

const API_BASE = 'http://localhost:3000';

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchList<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  const body = await res.json();
  if (body?.success === true && Array.isArray(body.data)) return body.data as T[];
  if (Array.isArray(body)) return body as T[];
  return [];
}

export default function Dashboard() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [lowStockSkus, setLowStockSkus] = useState<SKU[]>([]);
  const [approvalCount, setApprovalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [allSkus, lowStock, approvals] = await Promise.all([
        fetchList<SKU>(`${API_BASE}/sku`, signal),
        fetchList<SKU>(`${API_BASE}/inventory/skus/low-stock`, signal),
        fetchList<{ id: string }>(`${API_BASE}/approvals`, signal),
      ]);

      setSkus(allSkus);
      setLowStockSkus(lowStock);
      setApprovalCount(approvals.length);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong while loading dashboard data.');
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
          <span className="material-symbols-outlined animate-spin text-accent">refresh</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-on-surface-variant">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <span className="material-symbols-outlined text-red-600">error_outline</span>
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-on-surface">Unable to load dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => loadData()}
          className="bg-surface-container-highest text-primary text-xs font-medium px-2 py-1.5 rounded border border-outline-variant hover:bg-outline-variant transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  const totalSkus = skus.length;
  const lowStockCount = lowStockSkus.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight text-primary">Overview</h2>
          <p className="text-sm text-on-surface-variant mt-1">Real-time inventory intelligence and agent activity.</p>
        </div>
        <button className="bg-primary-container text-on-primary text-xs font-medium px-4 py-2 rounded flex items-center gap-1 hover:bg-surface-tint transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Total SKUs</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">category</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-semibold text-primary">{totalSkus.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Low Stock Items</span>
            <span className="material-symbols-outlined text-destructive text-[20px]">warning</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-semibold text-primary">{lowStockCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Pending Approvals</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">pending_actions</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-semibold text-primary">{approvalCount ?? '—'}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-2">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Monthly Savings</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">savings</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-semibold text-primary">—</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
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
                  <th className="text-[11px] font-semibold uppercase text-on-surface-variant px-4 h-8">Forecast</th>
                  <th className="text-[11px] font-semibold uppercase text-on-surface-variant px-6 h-8 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface">
                {lowStockSkus.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-sm text-on-surface-variant text-center">
                      No low stock items found.
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
                        <div className="text-[11px] text-on-surface-variant font-normal">{item.skuCode}</div>
                      </td>
                      <td className="px-4 text-destructive font-medium">{item.currentQuantity}</td>
                      <td className="px-4 text-on-surface-variant">{item.reorderThreshold}</td>
                      <td className="px-4 text-on-surface-variant">—</td>
                      <td className="px-6 text-right">
                        <button className="bg-surface-container-highest text-primary text-xs font-medium px-2 py-1 rounded border border-outline-variant hover:bg-outline-variant transition-colors group-hover:border-primary">
                          Draft PO
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 h-full flex flex-col">
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
                  <span className="font-semibold text-primary">Agent Alpha</span> automatically generated PO-4092 for
                  Quantum Cores.
                </p>
                <span className="text-[11px] font-semibold text-on-surface-variant mt-1">15 mins ago</span>
                <div className="mt-2 p-2 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">PO-4092.pdf</span>
                  <span className="material-symbols-outlined text-[16px] text-outline">download</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="w-10 h-10 rounded-full bg-error-container border-2 border-surface-container-lowest flex items-center justify-center shrink-0 -mt-1">
                <span className="material-symbols-outlined text-on-error-container text-[20px]">error_outline</span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm text-on-surface">
                  <span className="font-semibold text-primary">Agent Beta</span> flagged critical shortage prediction for
                  Q3.
                </p>
                <span className="text-[11px] font-semibold text-on-surface-variant mt-1">1 hr ago</span>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface-container-lowest flex items-center justify-center shrink-0 -mt-1">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">sync</span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm text-on-surface">System completed daily inventory sync.</p>
                <span className="text-[11px] font-semibold text-on-surface-variant mt-1">4 hrs ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
