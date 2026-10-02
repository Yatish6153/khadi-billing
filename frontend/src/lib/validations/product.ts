import { z } from 'zod';

// Mirrors backend/src/modules/products/product.schema.ts. Number fields are
// kept as strings in the form and converted when sending.

const numberText = (label: string, { required = false, decimals = 2 } = {}) =>
  z
    .string()
    .trim()
    .refine((v) => !required || v !== '', `${label} is required`)
    .refine((v) => v === '' || (/^\d+(\.\d+)?$/.test(v) && Number(v) >= 0), `Enter a valid ${label.toLowerCase()}`)
    .refine((v) => v === '' || !v.includes('.') || v.split('.')[1]!.length <= decimals, `Up to ${decimals} decimals`);

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required').max(150),
    sku: z
      .string()
      .trim()
      .max(40)
      .refine((v) => v === '' || /^[A-Za-z0-9][A-Za-z0-9\-_/]*$/.test(v), 'Use letters, numbers, - _ or /'),
    barcode: z
      .string()
      .trim()
      .max(64)
      .refine((v) => v === '' || /^[A-Za-z0-9\-]+$/.test(v), 'Use letters, numbers or -'),
    categoryId: z.string(),
    hsnCode: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[0-9]{4,8}$/.test(v), 'HSN code must be 4 to 8 digits'),
    gstRate: z.string(),
    purchasePrice: numberText('Purchase price'),
    sellingPrice: numberText('Selling price', { required: true }).refine((v) => v === '' || Number(v) > 0, 'Selling price must be more than 0'),
    taxInclusive: z.boolean(),
    unit: z.string(),
    trackStock: z.boolean(),
    openingStock: numberText('Opening stock', { decimals: 3 }),
    lowStockThreshold: numberText('Low stock level', { decimals: 3 }),
    isActive: z.boolean(),
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const stockAdjustSchema = z.object({
  mode: z.enum(['add', 'remove', 'set']),
  quantity: numberText('Quantity', { required: true, decimals: 3 }),
  note: z.string().trim().max(200),
});

export type StockAdjustValues = z.infer<typeof stockAdjustSchema>;
