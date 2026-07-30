import { useState, useEffect } from 'react';
import { skuApi } from '@/api/sku.api';
import { ApiError } from '@/api/client';
import type { SkuResponse } from '@/types';
import { skuSchema } from '../types';

interface UseSkuDataOptions {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useSkuData({ showToast }: UseSkuDataOptions) {
  const [skus, setSkus] = useState<SkuResponse[]>([]);
  const [skuLoading, setSkuLoading] = useState(true);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [skuSearch, setSkuSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [skuCategoryFilter, setSkuCategoryFilter] = useState('');
  const [skuSortBy, setSkuSortBy] = useState<string>('name');
  const [skuSortOrder, setSkuSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [skuPage, setSkuPage] = useState(1);
  const [skuLimit] = useState(20);
  const [skuMeta, setSkuMeta] = useState<any>(null);

  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuModalMode, setSkuModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSku, setSelectedSku] = useState<SkuResponse | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [skuToDelete, setSkuToDelete] = useState<SkuResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formVendorId, setFormVendorId] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [formServerErr, setFormServerErr] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(skuSearch);
      setSkuPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [skuSearch]);

  const loadSkus = async () => {
    setSkuLoading(true);
    setSkuError(null);
    try {
      const res = await skuApi.list({
        page: skuPage,
        limit: skuLimit,
        sortBy: skuSortBy,
        sortOrder: skuSortOrder,
        search: debouncedSearch,
        categoryId: skuCategoryFilter || undefined,
      });

      if (res && res.success) {
        setSkus(res.data || []);
        setSkuMeta(res.meta);
      } else {
        setSkus((res as any) || []);
        setSkuMeta(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load SKUs';
      setSkuError(msg);
      showToast(msg, 'error');
    } finally {
      setSkuLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (skuSortBy === column) {
      setSkuSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSkuSortBy(column);
      setSkuSortOrder('ASC');
    }
    setSkuPage(1);
  };

  const openSkuForm = (skuItem: SkuResponse | null = null) => {
    setFormErrors({});
    setFormServerErr(null);
    if (skuItem) {
      setSkuModalMode('edit');
      setSelectedSku(skuItem);
      setFormSku(skuItem.sku);
      setFormName(skuItem.name);
      setFormCategoryId(skuItem.categoryId || '');
      setFormCost(skuItem.cost.toString());
      setFormPrice(skuItem.price.toString());
      setFormVendorId(skuItem.preferredVendorId || '');
    } else {
      setSkuModalMode('create');
      setSelectedSku(null);
      setFormSku('');
      setFormName('');
      setFormCategoryId('');
      setFormCost('');
      setFormPrice('');
      setFormVendorId('');
    }
    setSkuModalOpen(true);
  };

  return {
    skus, skuLoading, skuError, skuMeta,
    skuPage, setSkuPage, skuLimit,
    skuSearch, setSkuSearch,
    debouncedSearch,
    skuCategoryFilter, setSkuCategoryFilter,
    skuSortBy, skuSortOrder,
    loadSkus, handleSort,
    skuModalOpen, setSkuModalOpen,
    skuModalMode, selectedSku,
    formSku, setFormSku,
    formName, setFormName,
    formCategoryId, setFormCategoryId,
    formCost, setFormCost,
    formPrice, setFormPrice,
    formVendorId, setFormVendorId,
    formErrors, formSubmitLoading, formServerErr,
    openSkuForm,
    deleteModalOpen, setDeleteModalOpen,
    skuToDelete, deleteLoading,
    confirmDeleteSku: (item: SkuResponse) => {
      setSkuToDelete(item);
      setDeleteModalOpen(true);
    },
    handleDeleteSku: async () => {
      if (!skuToDelete) return;
      setDeleteLoading(true);
      try {
        await skuApi.delete(skuToDelete.id);
        showToast(`SKU ${skuToDelete.sku} deleted successfully.`, 'success');
        setDeleteModalOpen(false);
        setSkuToDelete(null);
        void loadSkus();
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Failed to delete SKU', 'error');
      } finally {
        setDeleteLoading(false);
      }
    },
    handleSkuFormSubmit: async (e: React.FormEvent) => {
      e.preventDefault();
      setFormErrors({});
      setFormServerErr(null);

      const dataToValidate = {
        sku: formSku.toUpperCase().trim(),
        name: formName.trim(),
        cost: parseFloat(formCost),
        price: parseFloat(formPrice),
        categoryId: formCategoryId || null,
        preferredVendorId: formVendorId || null,
      };

      const validationResult = skuSchema.safeParse(dataToValidate);
      if (!validationResult.success) {
        const flat = validationResult.error.flatten().fieldErrors;
        const formattedErrors: Record<string, string> = {};
        Object.entries(flat).forEach(([key, val]) => {
          if (val && val[0]) formattedErrors[key] = val[0];
        });
        setFormErrors(formattedErrors);
        return;
      }

      setFormSubmitLoading(true);
      try {
        if (skuModalMode === 'create') {
          await skuApi.create(validationResult.data);
          showToast('SKU added successfully!', 'success');
        } else if (selectedSku) {
          await skuApi.update(selectedSku.id, validationResult.data);
          showToast('SKU updated successfully!', 'success');
        }
        setSkuModalOpen(false);
        void loadSkus();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'An error occurred while saving the SKU.';
        setFormServerErr(msg);
        showToast(msg, 'error');
      } finally {
        setFormSubmitLoading(false);
      }
    },
  };
}
