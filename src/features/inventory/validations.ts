import { z } from 'zod';

export const skuSchema = z.object({
  sku: z.string().min(2, 'SKU code must be at least 2 characters').max(50, 'SKU code is too long'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name is too long'),
  categoryId: z.string().optional().or(z.literal('')),
  cost: z.number().positive('Cost must be greater than 0'),
  price: z.number().positive('Price must be greater than 0'),
  preferredVendorId: z.string().optional().or(z.literal('')),
});

export type SkuInput = z.infer<typeof skuSchema>;

export const stockThresholdSchema = z.object({
  minimumStock: z.number().min(0, 'Minimum stock cannot be negative'),
  reorderPoint: z.number().min(0, 'Reorder point cannot be negative'),
}).refine(data => data.reorderPoint >= data.minimumStock, {
  message: 'Reorder point must be greater than or equal to minimum stock',
  path: ['reorderPoint'],
});

export type StockThresholdInput = z.infer<typeof stockThresholdSchema>;
