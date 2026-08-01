import { z } from 'zod';

export const userRoleEnum = z.enum([
  'super_admin',
  'tenant_owner',
  'warehouse_manager',
  'branch_manager',
  'inventory_clerk'
]);

export const userCreateSchema = z.object({
  name: z.string().optional().or(z.literal('')),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 'Password must contain uppercase, lowercase, number, and special character'),
  role: userRoleEnum,
  warehouseId: z.string().optional().or(z.literal('')),
});

export const userEditSchema = z.object({
  name: z.string().optional().or(z.literal('')),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  role: userRoleEnum,
  warehouseId: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
});
