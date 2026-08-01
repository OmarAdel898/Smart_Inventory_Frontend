import { useState, useEffect } from 'react';
import { categoryApi } from '../../../api/category.api';
import { vendorApi } from '../../../api/vendor.api';
import { warehouseApi } from '../../../api/warehouse.api';
import { skuApi } from '../../../api/sku.api';
import type { CategoryResponse, VendorResponse, WarehouseResponse, SkuResponse } from '../../../types/index';

export function useDropdownData() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [filterSkus, setFilterSkus] = useState<SkuResponse[]>([]);

  const loadDropdownData = async () => {
    try {
      const [cats, vends, whs, dropdownSkus] = await Promise.all([
        categoryApi.list().catch(() => ({ data: [] })),
        vendorApi.list({ page: 1, limit: 100 }).catch(() => ({ data: [] })),
        warehouseApi.list().catch(() => ({ data: [] })),
        skuApi.list({ page: 1, limit: 100 }).catch(() => ({ data: [] })),
      ]);

      const catData = Array.isArray(cats) ? cats : (cats as any)?.data || [];
      const vendData = Array.isArray(vends) ? vends : (vends as any)?.data || [];
      const whData = Array.isArray(whs) ? whs : (whs as any)?.data || [];

      let skuData: SkuResponse[] = [];
      if (dropdownSkus) {
        if (Array.isArray(dropdownSkus)) {
          skuData = dropdownSkus;
        } else if ('data' in dropdownSkus && Array.isArray((dropdownSkus as any).data)) {
          skuData = (dropdownSkus as any).data;
        }
      }

      setCategories(catData);
      setVendors(vendData);
      setWarehouses(whData);
      setFilterSkus(skuData);
    } catch (err) {
      console.error('Failed to load dropdown support data', err);
    }
  };

  useEffect(() => {
    void loadDropdownData();
  }, []);

  return { categories, vendors, warehouses, filterSkus, reload: loadDropdownData };
}
