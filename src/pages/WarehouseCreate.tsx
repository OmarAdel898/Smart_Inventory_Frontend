import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  MapPin,
  Warehouse as WarehouseIcon,
  Zap,
} from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { warehouseApi } from '@/api/warehouse.api';

const warehouseSchema = z.object({
  name: z
    .string()
    .min(2, 'Warehouse name must be at least 2 characters')
    .max(255, 'Warehouse name must be at most 255 characters'),
  location: z.string().max(255).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

export default function WarehouseCreate() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [errors, setErrors] = useState<Partial<Record<keyof WarehouseFormValues, string>>>({});

  const [pageLoading, setPageLoading] = useState(isEdit);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const warehouse = await warehouseApi.getById(id);
        setName(warehouse.name);
        setLocation(warehouse.location || '');
        setStatus(warehouse.status);
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Failed to load warehouse.');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    const data: WarehouseFormValues = {
      name: name.trim(),
      location: location.trim() || undefined,
      status,
    };

    const parsed = warehouseSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof WarehouseFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof WarehouseFormValues;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitLoading(true);
    try {
      if (isEdit && id) {
        await warehouseApi.update(id, parsed.data);
      } else {
        await warehouseApi.create(parsed.data);
      }
      setSuccess(true);
      setTimeout(() => navigate('/warehouses'), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save warehouse.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="font-medium text-on-surface">Loading warehouse...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <AlertCircle className="h-6 w-6 text-red-600" />
        <p className="text-sm text-on-surface">{pageError}</p>
        <Button variant="outline" onClick={() => navigate('/warehouses')}>Go back</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <p className="font-medium text-on-surface">
          Warehouse {isEdit ? 'updated' : 'created'} successfully
        </p>
        <p className="text-sm">Redirecting to warehouses list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/warehouses')} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm font-medium text-accent">Infrastructure</p>
            <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
              {isEdit ? 'Edit Warehouse' : 'Create Warehouse'}
            </h1>
          </div>
        </div>
        <p className="text-sm text-on-surface-variant max-w-2xl ml-10">
          {isEdit
            ? 'Update the warehouse information and operational status.'
            : 'Fill in the primary information for the new distribution hub.'}
        </p>
      </div>

      <Card className="border-outline-variant/60 shadow-sm overflow-hidden">
        <div className="h-1 bg-secondary w-full" />
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-on-surface">Warehouse Details</CardTitle>
              <CardDescription>
                {isEdit
                  ? 'Modify the warehouse configuration below.'
                  : 'Configure the new warehouse location and operational status.'}
              </CardDescription>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30">
              <WarehouseIcon className="h-6 w-6 text-secondary" />
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-on-surface">
                Warehouse Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter unique warehouse identifier"
                  className={`h-12 px-4 py-3 text-sm ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </div>
              {errors.name && (
                <div className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{errors.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-on-surface">
                Location / Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 123 Logistics Ave, Industrial Zone 4"
                  className="h-12 pl-12 pr-4 py-3 text-sm"
                />
              </div>
              {errors.location && (
                <div className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{errors.location}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-5 border-t border-b border-outline-variant/10">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg border border-outline-variant/20">
                    <Zap className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Warehouse Status</p>
                    <p className="text-[11px] text-on-surface-variant">Set the operational state</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="h-9 rounded-md border border-outline-variant bg-white px-3 text-sm font-medium text-on-surface shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg bg-surface-container border border-secondary/10 p-4">
              <Info className="h-5 w-5 shrink-0 text-secondary" />
              <p className="text-sm text-on-surface-variant">
                {isEdit
                  ? 'Changes to this warehouse will take effect immediately across the system.'
                  : 'Creating a new warehouse will automatically provision stock levels for all current catalog items. This process can take up to 2 minutes.'}
              </p>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </CardContent>

          <div className="border-t border-outline-variant/50 bg-surface-container-low px-6 py-5 flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/warehouses')} className="px-6 py-2.5 h-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={submitLoading} className="px-8 py-2.5 h-auto gap-2 shadow-lg shadow-primary/20">
              {submitLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              {isEdit ? 'Update Warehouse' : 'Save Warehouse'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
