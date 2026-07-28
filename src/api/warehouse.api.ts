import { api } from './client';
import type { WarehouseResponse } from '../types';

export const warehouseApi = {
  list: () => {
    return api.get<WarehouseResponse[]>('/warehouses');
  },
};
