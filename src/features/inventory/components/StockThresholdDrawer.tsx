import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StockLevelResponse } from '@/types';

interface StockThresholdDrawerProps {
  selectedStockLevel: StockLevelResponse;
  drawerReorderThreshold: string;
  setDrawerReorderThreshold: (v: string) => void;
  drawerSafetyStock: string;
  setDrawerSafetyStock: (v: string) => void;
  drawerFormErrors: Record<string, string>;
  drawerServerErr: string | null;
  drawerLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function StockThresholdDrawer({
  selectedStockLevel,
  drawerReorderThreshold, setDrawerReorderThreshold,
  drawerSafetyStock, setDrawerSafetyStock,
  drawerFormErrors, drawerServerErr, drawerLoading,
  onSubmit, onClose,
}: StockThresholdDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
        <div>
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <div className="space-y-0.5">
              <h3 className="text-lg font-semibold text-gray-900">Adjust Thresholds</h3>
              <p className="text-xs text-gray-500">Update safe stock margins for warehouse node.</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {drawerServerErr && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{drawerServerErr}</span>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">SKU Name</p>
              <p className="text-base font-semibold text-gray-900">{selectedStockLevel.skuName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Warehouse Node</p>
              <p className="text-base font-semibold text-gray-900">{selectedStockLevel.warehouseName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quantity On Hand</p>
              <p className="text-lg font-mono font-bold text-[#0066CC]">{selectedStockLevel.quantity.toLocaleString()}</p>
            </div>

            <form id="drawer-form" onSubmit={onSubmit} className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="drawer-reorder" className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Reorder Threshold <span className="text-red-500">*</span>
                </label>
                <input
                  id="drawer-reorder"
                  type="number"
                  min="0"
                  step="1"
                  value={drawerReorderThreshold}
                  onChange={(e) => setDrawerReorderThreshold(e.target.value)}
                  className={`h-9 px-3 bg-white rounded-lg border text-sm text-gray-900 outline-none transition-all focus:ring-1 ${
                    drawerFormErrors.reorderThreshold
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-200 focus:border-accent focus:ring-accent'
                  }`}
                  required
                />
                <p className="text-[10px] text-gray-500">
                  Triggers a reorder alert when stock falls below or equal to this level.
                </p>
                {drawerFormErrors.reorderThreshold && (
                  <p className="text-[11px] text-red-500 mt-0.5">{drawerFormErrors.reorderThreshold}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="drawer-safety" className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Safety Stock Buffer <span className="text-red-500">*</span>
                </label>
                <input
                  id="drawer-safety"
                  type="number"
                  min="0"
                  step="1"
                  value={drawerSafetyStock}
                  onChange={(e) => setDrawerSafetyStock(e.target.value)}
                  className={`h-9 px-3 bg-white rounded-lg border text-sm text-gray-900 outline-none transition-all focus:ring-1 ${
                    drawerFormErrors.safetyStock
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-200 focus:border-accent focus:ring-accent'
                  }`}
                  required
                />
                <p className="text-[10px] text-gray-500">
                  Emergency safety stock buffer that should always remain on hand.
                </p>
                {drawerFormErrors.safetyStock && (
                  <p className="text-[11px] text-red-500 mt-0.5">{drawerFormErrors.safetyStock}</p>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-5 bg-gray-50-low border-t border-gray-200">
          <button type="button" variant="cancel" onClick={onClose} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex-1">
            Cancel
          </button>
          <Button type="submit" form="drawer-form" disabled={drawerLoading} className="flex-1">
            {drawerLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              'Update thresholds'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
