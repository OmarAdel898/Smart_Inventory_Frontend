import { z } from 'zod';

export const warehouseSchema = z.object({
  name: z
    .string()
    .min(2, 'Warehouse name must be at least 2 characters')
    .max(255, 'Warehouse name must be at most 255 characters'),
  location: z.string().max(255).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
});
