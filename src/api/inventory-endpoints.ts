export const INVENTORY_ENDPOINTS = {
  WAREHOUSES: '/warehouses',
  STOCK_LEVELS: '/stock-levels',
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
} as const;
