import { z } from 'zod';

export type Toast = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
};

export const skuSchema = z.object({
  sku: z
    .string()
    .min(2, 'SKU must be at least 2 characters')
    .max(100, 'SKU must be 100 characters or less')
    .regex(/^[A-Z0-9-_]+$/, 'SKU can only contain uppercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be 255 characters or less'),
  cost: z.number().positive('Cost must be positive'),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string().uuid('Invalid Category').optional().nullable(),
  preferredVendorId: z.string().uuid('Invalid Vendor').optional().nullable(),
});

export const stockLevelThresholdSchema = z.object({
  reorderThreshold: z.number().int('Must be an integer').min(0, 'Must be 0 or greater'),
  safetyStock: z.number().int('Must be an integer').min(0, 'Must be 0 or greater'),
});

export type SkuFormData = z.infer<typeof skuSchema>;
export type StockLevelThresholdData = z.infer<typeof stockLevelThresholdSchema>;
