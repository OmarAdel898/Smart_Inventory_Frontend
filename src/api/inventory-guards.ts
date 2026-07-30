import type { StockLevelResponse } from './inventory-types';

export function isLowStock(level: StockLevelResponse): boolean {
  return level.quantity <= level.reorderThreshold && level.quantity > 0;
}

export function isOutOfStock(level: StockLevelResponse): boolean {
  return level.quantity === 0;
}

export function isHealthy(level: StockLevelResponse): boolean {
  return level.quantity > level.reorderThreshold;
}
