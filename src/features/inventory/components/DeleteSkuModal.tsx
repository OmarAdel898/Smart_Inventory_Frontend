import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkuResponse } from '@/types';

interface DeleteSkuModalProps {
  skuToDelete: SkuResponse | null;
  deleteLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteSkuModal({ skuToDelete, deleteLoading, onConfirm, onClose }: DeleteSkuModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 transition-opacity">
      <div className="bg-surface rounded-xl max-w-md w-full border border-outline-variant shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-on-surface">Delete SKU Catalog entry?</h3>
              <p className="text-sm text-on-surface-variant">
                Are you sure you want to delete{' '}
                <strong className="text-on-surface">{skuToDelete?.sku}</strong> ({skuToDelete?.name})? This action
                will soft-delete the SKU and cannot be easily undone.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-container-low border-t border-outline-variant/50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleteLoading}>
            {deleteLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete SKU'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
