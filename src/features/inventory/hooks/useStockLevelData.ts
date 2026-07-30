import { useState } from 'react';
import { stockLevelApi } from '../../../api/stock-level.api';
import { ApiError } from '../../../api/client';
import type { StockLevelResponse } from '../../../types/index';
import { stockLevelThresholdSchema } from '../types';

interface UseStockLevelDataOptions {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useStockLevelData({ showToast }: UseStockLevelDataOptions) {
  const [stockLevels, setStockLevels] = useState<StockLevelResponse[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState('');
  const [stockSkuFilter, setStockSkuFilter] = useState('');
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit] = useState(20);
  const [stockMeta, setStockMeta] = useState<any>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStockLevel, setSelectedStockLevel] = useState<StockLevelResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerReorderThreshold, setDrawerReorderThreshold] = useState('');
  const [drawerSafetyStock, setDrawerSafetyStock] = useState('');
  const [drawerFormErrors, setDrawerFormErrors] = useState<Record<string, string>>({});
  const [drawerServerErr, setDrawerServerErr] = useState<string | null>(null);

  const loadStockLevels = async () => {
    setStockLoading(true);
    setStockError(null);
    try {
      const res = await stockLevelApi.list({
        page: stockPage,
        limit: stockLimit,
        warehouseId: stockWarehouseFilter || undefined,
        skuId: stockSkuFilter || undefined,
      });

      if (res && res.success) {
        setStockLevels(res.data || []);
        setStockMeta(res.meta);
      } else {
        setStockLevels((res as any) || []);
        setStockMeta(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load stock levels';
      setStockError(msg);
      showToast(msg, 'error');
    } finally {
      setStockLoading(false);
    }
  };

  const openStockLevelDrawer = (level: StockLevelResponse) => {
    setDrawerFormErrors({});
    setDrawerServerErr(null);
    setSelectedStockLevel(level);
    setDrawerReorderThreshold(level.reorderThreshold.toString());
    setDrawerSafetyStock(level.safetyStock.toString());
    setDrawerOpen(true);
  };

  const handleStockLevelUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockLevel) return;
    setDrawerFormErrors({});
    setDrawerServerErr(null);

    const validationResult = stockLevelThresholdSchema.safeParse({
      reorderThreshold: parseInt(drawerReorderThreshold, 10),
      safetyStock: parseInt(drawerSafetyStock, 10),
    });

    if (!validationResult.success) {
      const flat = validationResult.error.flatten().fieldErrors;
      const formattedErrors: Record<string, string> = {};
      Object.entries(flat).forEach(([key, val]) => {
        if (val && val[0]) formattedErrors[key] = val[0];
      });
      setDrawerFormErrors(formattedErrors);
      return;
    }

    setDrawerLoading(true);
    try {
      await stockLevelApi.update(selectedStockLevel.id, validationResult.data);
      showToast('Stock level thresholds updated successfully!', 'success');
      setDrawerOpen(false);
      void loadStockLevels();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update stock thresholds';
      setDrawerServerErr(msg);
      showToast(msg, 'error');
    } finally {
      setDrawerLoading(false);
    }
  };

  return {
    stockLevels, stockLoading, stockError, stockMeta,
    stockPage, setStockPage, stockLimit,
    stockWarehouseFilter, setStockWarehouseFilter,
    stockSkuFilter, setStockSkuFilter,
    loadStockLevels,
    drawerOpen, setDrawerOpen,
    selectedStockLevel,
    drawerLoading,
    drawerReorderThreshold, setDrawerReorderThreshold,
    drawerSafetyStock, setDrawerSafetyStock,
    drawerFormErrors, drawerServerErr,
    openStockLevelDrawer, handleStockLevelUpdate,
  };
}
