import { AlertCircle, ChevronLeft, ChevronRight, Loader2, RefreshCw, Sliders } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { StockLevelResponse } from '@/types';

interface StockLevelTableProps {
  stockLevels: StockLevelResponse[];
  stockLoading: boolean;
  stockError: string | null;
  stockMeta: any;
  stockPage: number;
  setStockPage: (fn: (p: number) => number) => void;
  onRetry: () => void;
  onAdjust: (item: StockLevelResponse) => void;
}

export function StockLevelTable({
  stockLevels, stockLoading, stockError, stockMeta,
  stockPage, setStockPage,
  onRetry, onAdjust,
}: StockLevelTableProps) {
  return (
    <>
      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">Stock Threshold Matrix</CardTitle>
          <CardDescription>
            Live monitoring of quantities and safe operating buffers across nodes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stockLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm font-medium">Loading stock levels...</p>
            </div>
          ) : stockError ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium">Unable to load stock levels: {stockError}</p>
              <Button variant="outline" onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : stockLevels.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <AlertCircle className="h-8 w-8 text-accent" />
              <p className="text-sm font-medium text-on-surface">No stock levels recorded</p>
              <p className="text-xs">Verify warehouse associations or add movements to populate quantities.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container/70 border-b border-outline-variant">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      SKU Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Warehouse Node
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Quantity On Hand
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Safety Stock
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Reorder Threshold
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Status Alert
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {stockLevels.map((item, index) => {
                    const isLowStock = item.quantity <= item.reorderThreshold;
                    const isOutOfStock = item.quantity === 0;
                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-outline-variant/40 transition-colors hover:bg-surface-container/30 ${
                          index % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                        }`}
                      >
                        <td className="px-6 py-4 align-middle text-sm font-semibold text-on-surface">
                          {item.skuName}
                        </td>
                        <td className="px-6 py-4 align-middle text-sm text-on-surface-variant">
                          {item.warehouseName}
                        </td>
                        <td className="px-6 py-4 align-middle text-right text-sm font-bold text-on-surface font-mono">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 align-middle text-right text-sm text-on-surface-variant font-mono">
                          {item.safetyStock.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 align-middle text-right text-sm text-on-surface-variant font-mono">
                          {item.reorderThreshold.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 align-middle text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              <span className="status-dot red" /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="status-dot yellow" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <span className="status-dot green" /> Healthy
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-middle text-right text-sm">
                          <button
                            onClick={() => onAdjust(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-outline-variant bg-surface hover:bg-surface-container-high transition-colors"
                            title="Adjust Thresholds"
                          >
                            <Sliders className="h-3 w-3" /> Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {stockMeta && stockMeta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-outline-variant/40 pt-4 px-2">
          <span className="text-xs text-on-surface-variant">
            Showing page <strong className="text-on-surface font-medium">{stockMeta.page}</strong> of{' '}
            <strong className="text-on-surface font-medium">{stockMeta.totalPages}</strong> ({stockMeta.total} items)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStockPage((p) => Math.max(1, p - 1))}
              disabled={!stockMeta.hasPrevPage || stockLoading}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStockPage((p) => Math.min(stockMeta.totalPages, p + 1))}
              disabled={!stockMeta.hasNextPage || stockLoading}
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
