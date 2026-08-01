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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { warehouseApi, type Warehouse } from '@/api/warehouse.api';
import { getAccessTokenFromCookie, getWarehouseIdFromToken, getRoleFromToken } from '@/lib/auth';

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(d);
}

export default function Warehouses() {
  const navigate = useNavigate();
  const token = getAccessTokenFromCookie();
  const userRole = getRoleFromToken(token);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Warehouse | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = getAccessTokenFromCookie();
      const       warehouseId = getWarehouseIdFromToken(token);

      if (warehouseId) {
        const warehouse = await warehouseApi.getById(warehouseId);
        if (warehouse && typeof warehouse === 'object' && 'id' in warehouse) {
          setWarehouses([warehouse]);
          setSelected(warehouse);
        }
      } else {
        const data = await warehouseApi.list();
        setWarehouses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Infrastructure</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Warehouses</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {selected && warehouses.length === 1
              ? `Your assigned warehouse — ${selected.name}`
              : 'Manage warehouse locations, details, and operational info.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-2.5 shadow-sm">
            <Building2 className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-on-surface">{warehouses.length} location{(warehouses.length !== 1) ? 's' : ''}</span>
          </div>
          <Button onClick={() => navigate('/warehouses/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Warehouse
          </Button>
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
                        <CardDescription className="text-xs">
                          {w.location || 'No location set'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {w.isMain && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-medium text-secondary">
                          <Star className="h-3 w-3" />
                          Main
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        w.status === 'active'
                          ? 'bg-green-500/10 text-green-700'
                          : 'bg-red-500/10 text-red-700'
                      }`}>
                        {w.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/warehouses/${w.id}/edit`); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-surface-container hover:text-accent transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-on-surface">{selected.name}</CardTitle>
                        <CardDescription>Warehouse details</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/warehouses/${selected.id}/edit`)}
                          className="gap-2 shrink-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {['tenant_owner', 'super_admin'].includes(userRole || '') && (
                          selected.status?.toUpperCase() !== 'INACTIVE' ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteTarget(selected)}
                              className="gap-2 shrink-0"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(selected)}
                              className="gap-2 shrink-0 text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {selected.location && (
                        <div className="rounded-lg border border-outline-variant/60 p-3">
                          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                            <MapPin className="h-3 w-3" />
                            Location
                          </div>
                          <p className="text-sm font-medium text-on-surface">{selected.location}</p>
                        </div>
                      )}
                      <div className="rounded-lg border border-outline-variant/60 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                          <Zap className="h-3 w-3" />
                          Status
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                          selected.status === 'active'
                            ? 'bg-green-500/10 text-green-700'
                            : 'bg-red-500/10 text-red-700'
                        }`}>
                          {selected.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="rounded-lg border border-outline-variant/60 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                          <Star className="h-3 w-3" />
                          Main Hub
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                          selected.isMain
                            ? 'bg-secondary/10 text-secondary'
                            : 'bg-outline-variant/30 text-on-surface-variant'
                        }`}>
                          {selected.isMain ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {selected.tenantId && (
                        <div className="rounded-lg border border-outline-variant/60 p-3">
                          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                            Tenant
                          </div>
                          <p className="text-sm font-mono text-on-surface truncate">{selected.tenantId.slice(0, 8)}…</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 text-[11px] text-outline">
                      Created: {formatDate(selected.createdAt)}
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
                          View detailed stock and operations data for this warehouse.
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => !deleteLoading && setDeleteTarget(null)} />
          <div className="relative bg-surface-container-lowest w-full max-w-md rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">Confirm Deactivation</h3>
                  <p className="text-sm text-on-surface-variant">Irreversible action</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Are you sure you want to deactivate <strong className="text-on-surface">{deleteTarget.name}</strong>? This action cannot be undone and will deactivate all users assigned to this warehouse.
              </p>
              {deleteError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
              <div className="flex items-center gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="gap-2"
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Deactivate Warehouse
                </Button>
              </div>
            </div>
            {deleteLoading && (
              <div className="h-1 w-full bg-red-100">
                <div className="h-full bg-red-500 w-full animate-pulse" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
