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
      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">SKU Directory</CardTitle>
          <CardDescription>
            Catalog of stock keeping units with cost settings and vendor alignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {skuLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm font-medium">Loading SKU catalog...</p>
            </div>
          ) : skuError ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium">Unable to load catalog: {skuError}</p>
              <Button variant="outline" onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : skus.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <AlertCircle className="h-8 w-8 text-accent" />
              <p className="text-sm font-medium text-on-surface">No SKUs found</p>
              <p className="text-xs">Try adjusting your filters or search terms or add a new SKU.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container/70 border-b border-outline-variant">
                    <th
                      onClick={() => onSort('sku')}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors"
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
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Display Name
                        {skuSortBy === 'name' && (
                          <span className="text-[10px]">{skuSortOrder === 'ASC' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Category
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Cost Price
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Selling Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Preferred Vendor
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {skus.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-t border-outline-variant/40 transition-colors hover:bg-surface-container/30 ${
                        index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                      }`}
                    >
                      <td className="px-6 py-4 align-middle font-mono text-xs font-medium text-on-surface">
                        <div className="flex items-center gap-2">
                          <span>{item.sku}</span>
                          <button
                            onClick={() => onCopy(item.sku)}
                            className="text-on-surface-variant/40 hover:text-on-surface p-0.5 hover:bg-surface-container rounded transition-colors"
                            title="Copy SKU code"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-sm font-semibold text-on-surface">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 align-middle text-sm text-on-surface-variant">
                        {item.categoryId ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary-container/30 text-on-secondary-container border border-secondary-container/50">
                            {categoryMap.get(item.categoryId) || 'Loading...'}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-sm text-on-surface font-mono">
                        ${item.cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-sm text-on-surface font-mono">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 align-middle text-sm text-on-surface-variant">
                        {item.preferredVendorId ? (
                          vendorMap.get(item.preferredVendorId) || 'Loading...'
                        ) : (
                          <span className="text-on-surface-variant/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1 hover:bg-surface-container hover:text-primary rounded text-on-surface-variant/80 transition-colors"
                            title="Edit SKU"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(item)}
                            className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-on-surface-variant/80 transition-colors"
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
        <div className="flex items-center justify-between border-t border-outline-variant/40 pt-4 px-2">
          <span className="text-xs text-on-surface-variant">
            Showing page <strong className="text-on-surface font-medium">{skuMeta.page}</strong> of{' '}
            <strong className="text-on-surface font-medium">{skuMeta.totalPages}</strong> ({skuMeta.total} items)
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
