import { AlertCircle, ChevronLeft, ChevronRight, Copy, Edit2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SkuResponse, CategoryResponse, VendorResponse } from '@/types';

interface SkuTableProps {
  skus: SkuResponse[];
  skuLoading: boolean;
  skuError: string | null;
  skuMeta: any;
  skuPage: number;
  setSkuPage: (fn: (p: number) => number) => void;
  skuSortBy: string;
  skuSortOrder: 'ASC' | 'DESC';
  categories: CategoryResponse[];
  vendors: VendorResponse[];
  onSort: (column: string) => void;
  onEdit: (sku: SkuResponse) => void;
  onDelete: (sku: SkuResponse) => void;
  onRetry: () => void;
  onCopy: (text: string) => void;
}

export function SkuTable({
  skus, skuLoading, skuError, skuMeta,
  skuPage, setSkuPage,
  skuSortBy, skuSortOrder,
  categories, vendors,
  onSort, onEdit, onDelete, onRetry, onCopy,
}: SkuTableProps) {
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.id, v.name])), [vendors]);

  return (
    <>
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-white">
          <CardTitle className="text-xl text-gray-900">SKU Directory</CardTitle>
          <CardDescription>
            Catalog of stock keeping units with cost settings and vendor alignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {skuLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
              <p className="text-sm font-medium">Loading SKU catalog...</p>
            </div>
          ) : skuError ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-500">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium">Unable to load catalog: {skuError}</p>
              <Button variant="outline" onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : skus.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-500">
              <AlertCircle className="h-8 w-8 text-[#0066CC]" />
              <p className="text-sm font-medium text-gray-900">No SKUs found</p>
              <p className="text-xs">Try adjusting your filters or search terms or add a new SKU.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      onClick={() => onSort('sku')}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        SKU Code
                        {skuSortBy === 'sku' && (
                          <span className="text-[10px]">{skuSortOrder === 'ASC' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => onSort('name')}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Display Name
                        {skuSortBy === 'name' && (
                          <span className="text-[10px]">{skuSortOrder === 'ASC' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Category
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Cost Price
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Selling Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Preferred Vendor
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {skus.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-200 transition-colors hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-white'
                      }`}
                    >
                      <td className="px-6 py-4 align-middle font-mono text-xs font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{item.sku}</span>
                          <button
                            onClick={() => onCopy(item.sku)}
                            className="text-gray-500/40 hover:text-gray-900 p-0.5 hover:bg-gray-50 rounded transition-colors"
                            title="Copy SKU code"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-sm font-semibold text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 align-middle text-sm text-gray-500">
                        {item.categoryId ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100/30 text-on-secondary-container border border-secondary-container/50">
                            {categoryMap.get(item.categoryId) || 'Loading...'}
                          </span>
                        ) : (
                          <span className="text-gray-500/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-sm text-gray-900 font-mono">
                        ${item.cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-sm text-gray-900 font-mono">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 align-middle text-sm text-gray-500">
                        {item.preferredVendorId ? (
                          vendorMap.get(item.preferredVendorId) || 'Loading...'
                        ) : (
                          <span className="text-gray-500/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1 hover:bg-gray-50 hover:text-[#0066CC] rounded text-gray-500/80 transition-colors"
                            title="Edit SKU"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(item)}
                            className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-500/80 transition-colors"
                            title="Delete SKU"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {skuMeta && skuMeta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 px-2">
          <span className="text-xs text-gray-500">
            Showing page <strong className="text-gray-900 font-medium">{skuMeta.page}</strong> of{' '}
            <strong className="text-gray-900 font-medium">{skuMeta.totalPages}</strong> ({skuMeta.total} items)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSkuPage((p) => Math.max(1, p - 1))}
              disabled={!skuMeta.hasPrevPage || skuLoading}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSkuPage((p) => Math.min(skuMeta.totalPages, p + 1))}
              disabled={!skuMeta.hasNextPage || skuLoading}
              className="h-8 px-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
