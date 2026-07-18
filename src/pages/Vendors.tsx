import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function CellValue({ children }: { children: string | null }) {
  return <span className={children ? 'text-on-surface' : 'text-on-surface-variant'}>{children || '—'}</span>;
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

function EmptyState() {
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

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/vendors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.message ||
          `Failed to load vendors (${response.status})`;
        throw new Error(message);
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
        </div>
      </div>

      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">Vendor Directory</CardTitle>
          <CardDescription>
            Complete vendor list with contact information and audit timestamps.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadVendors()} />
          ) : vendors.length === 0 ? (
            <EmptyState />
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
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {vendors.map((vendor, index) => (
                    <tr
                      key={vendor.id}
                      className={`border-t border-outline-variant/40 transition-colors hover:bg-surface-container/40 ${
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
