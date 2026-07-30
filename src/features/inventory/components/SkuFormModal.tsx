import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CategoryResponse, VendorResponse } from '@/types';

interface SkuFormModalProps {
  mode: 'create' | 'edit';
  categories: CategoryResponse[];
  vendors: VendorResponse[];
  formSku: string;
  setFormSku: (v: string) => void;
  formName: string;
  setFormName: (v: string) => void;
  formCategoryId: string;
  setFormCategoryId: (v: string) => void;
  formCost: string;
  setFormCost: (v: string) => void;
  formPrice: string;
  setFormPrice: (v: string) => void;
  formVendorId: string;
  setFormVendorId: (v: string) => void;
  formErrors: Record<string, string>;
  formSubmitLoading: boolean;
  formServerErr: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function SkuFormModal({
  mode, categories, vendors,
  formSku, setFormSku,
  formName, setFormName,
  formCategoryId, setFormCategoryId,
  formCost, setFormCost,
  formPrice, setFormPrice,
  formVendorId, setFormVendorId,
  formErrors, formSubmitLoading, formServerErr,
  onSubmit, onClose,
}: SkuFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 transition-opacity">
      <div className="bg-surface rounded-xl max-w-lg w-full border border-outline-variant shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/50">
          <h3 className="text-lg font-semibold text-on-surface">
            {mode === 'create' ? 'Add New SKU' : 'Edit SKU'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-4">
            {formServerErr && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formServerErr}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-sku" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                  SKU Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-sku"
                  type="text"
                  placeholder="e.g. LAPTOP-PRO-001"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                  className={`h-9 px-3 bg-surface rounded-lg border text-sm text-on-surface outline-none transition-all focus:ring-1 ${
                    formErrors.sku
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-outline-variant focus:border-accent focus:ring-accent'
                  }`}
                  required
                />
                {formErrors.sku && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.sku}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-name" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-name"
                  type="text"
                  placeholder="e.g. Laptop Pro 15"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`h-9 px-3 bg-surface rounded-lg border text-sm text-on-surface outline-none transition-all focus:ring-1 ${
                    formErrors.name
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-outline-variant focus:border-accent focus:ring-accent'
                  }`}
                  required
                />
                {formErrors.name && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-cost" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                  Cost Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-cost"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="850.00"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  className={`h-9 px-3 bg-surface rounded-lg border text-sm text-on-surface outline-none transition-all focus:ring-1 ${
                    formErrors.cost
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-outline-variant focus:border-accent focus:ring-accent'
                  }`}
                  required
                />
                {formErrors.cost && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.cost}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-price" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                  Selling Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-price"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="1299.99"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className={`h-9 px-3 bg-surface rounded-lg border text-sm text-on-surface outline-none transition-all focus:ring-1 ${
                    formErrors.price
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-outline-variant focus:border-accent focus:ring-accent'
                  }`}
                  required
                />
                {formErrors.price && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.price}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-category" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                  Category
                </label>
                <select
                  id="modal-category"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="h-9 px-3 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-vendor" className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                  Preferred Vendor
                </label>
                <select
                  id="modal-vendor"
                  value={formVendorId}
                  onChange={(e) => setFormVendorId(e.target.value)}
                  className="h-9 px-3 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">No Preferred Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-container-low border-t border-outline-variant/50">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={formSubmitLoading}>
              {formSubmitLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save SKU'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
