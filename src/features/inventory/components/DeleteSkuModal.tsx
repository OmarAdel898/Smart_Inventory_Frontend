import { Loader2, Trash2, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative p-6">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-gray-900">Delete SKU Catalog entry?</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete{' '}
                <strong className="text-gray-900">{skuToDelete?.sku}</strong> ({skuToDelete?.name})? This action
                will soft-delete the SKU and cannot be easily undone.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50-low border-t border-gray-200">
          <button variant="cancel" onClick={onClose} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
            Cancel
          </button>
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
