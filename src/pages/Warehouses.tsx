import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Loader2,
  MapPin,
  RefreshCw,
  Warehouse as WarehouseIcon,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { warehouseApi, type Warehouse } from '@/api/warehouse.api';

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(d);
}

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 10)}…` : value;
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Warehouse | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await warehouseApi.list();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Infrastructure</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Warehouses</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage warehouse locations, details, and operational info.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-2.5 shadow-sm">
            <Building2 className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-on-surface">{warehouses.length} locations</span>
          </div>
          <Button variant="outline" onClick={() => load(true)} disabled={loading || refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="font-medium text-on-surface">Loading warehouses...</p>
        </div>
      ) : error ? (
        <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <p className="text-sm text-on-surface">{error}</p>
          <Button variant="outline" onClick={() => load()}>Try again</Button>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <WarehouseIcon className="h-8 w-8 text-accent/50" />
          <p className="font-medium text-on-surface">No warehouses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            {warehouses.map((w) => (
              <Card
                key={w.id}
                className={`border-outline-variant/60 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  selected?.id === w.id ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setSelected(w)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <WarehouseIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base text-on-surface truncate">{w.name}</CardTitle>
                        {w.location && (
                          <CardDescription className="font-mono text-xs">{w.location}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {w.isMain && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                          Main
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          w.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-on-surface-variant">
                    {w.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {w.location}
                      </span>
                    )}
                  </div>

                  {w.createdAt && (
                    <p className="mt-3 text-[11px] text-outline">Created {formatDate(w.createdAt)}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-5 space-y-4 sticky top-8">
            {selected ? (
              <>
                <Card className="border-outline-variant/60 shadow-sm overflow-hidden">
                  <div className="h-2 bg-accent" />
                  <CardHeader>
                    <CardTitle className="text-xl text-on-surface">{selected.name}</CardTitle>
                    <CardDescription>
                      {selected.location ? `Location: ${selected.location}` : 'Warehouse details'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-outline-variant/60 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                          <BarChart3 className="h-3 w-3" />
                          Status
                        </div>
                        <p className="text-sm font-medium text-on-surface capitalize">{selected.status}</p>
                      </div>
                      <div className="rounded-lg border border-outline-variant/60 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                          <WarehouseIcon className="h-3 w-3" />
                          Main
                        </div>
                        <p className="text-sm font-medium text-on-surface">{selected.isMain ? 'Yes' : 'No'}</p>
                      </div>
                      {selected.location && (
                        <div className="rounded-lg border border-outline-variant/60 p-3">
                          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                            <MapPin className="h-3 w-3" />
                            Location
                          </div>
                          <p className="text-sm font-medium text-on-surface">{selected.location}</p>
                        </div>
                      )}
                      {selected.tenantId && (
                        <div className="rounded-lg border border-outline-variant/60 p-3">
                          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                            <Building2 className="h-3 w-3" />
                            Tenant
                          </div>
                          <p className="text-sm font-medium text-on-surface font-mono">{shortId(selected.tenantId)}</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 text-[11px] text-outline">
                      ID: {shortId(selected.id)} &middot; Created: {formatDate(selected.createdAt)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-outline-variant/60 shadow-sm bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-on-surface">{selected.name}</div>
                        <div className="text-xs text-on-surface-variant">
                          Select this warehouse to view detailed stock and operations data.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-outline-variant/60 shadow-sm">
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                  <Building2 className="h-8 w-8 text-accent/50" />
                  <p className="font-medium text-on-surface">Select a warehouse</p>
                  <p className="text-sm text-center max-w-xs">
                    Click on a warehouse from the list to view its full details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
