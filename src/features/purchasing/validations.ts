import { z } from 'zod';

export const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  warehouseId: z.string().min(1, 'Please select a warehouse'),
  lineItems: z
    .array(
      z.object({
        skuId: z.string().min(1, 'Please select a SKU'),
        quantity: z.coerce.number().int('Quantity must be a whole number').positive('Quantity must be greater than 0'),
        unitPrice: z.coerce.number().positive('Unit price must be greater than 0'),
      }),
    )
    .min(1, 'Add at least one line item'),
});
