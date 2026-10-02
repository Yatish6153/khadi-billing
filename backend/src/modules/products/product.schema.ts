import { z } from 'zod';
import { Unit } from '@prisma/client';
import { paginationQuery } from '../../utils/pagination';

/** GST rates in use in India (incl. the 40% slab from the Sept 2025 GST reform). */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40] as const;

/** Rupee amount, rounded to paise. */
const money = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(0, `${label} can't be negative`)
    .max(10_000_000, `${label} is too large`)
    .transform((v) => Math.round(v * 100) / 100);

/** Quantity with up to 3 decimals (fabric in metres, e.g. 2.750). */
export const quantity = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(0, `${label} can't be negative`)
    .max(1_000_000, `${label} is too large`)
    .transform((v) => Math.round(v * 1000) / 1000);

const optionalCode = (max: number, pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .max(max)
    .refine((v) => v === '' || pattern.test(v), message)
    .transform((v) => (v === '' ? null : v))
    .nullish();

const productFields = {
  name: z.string().trim().min(1, 'Product name is required').max(150),
  sku: optionalCode(40, /^[A-Z0-9][A-Z0-9\-_/]*$/, 'Use letters, numbers, - _ or /'),
  barcode: optionalCode(64, /^[A-Z0-9\-]+$/, 'Use letters, numbers or -'),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  hsnCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[0-9]{4,8}$/.test(v), 'HSN code must be 4 to 8 digits')
    .transform((v) => (v === '' ? null : v))
    .nullish(),
  /** Optional: falls back to the shop's default GST rate (Settings) */
  gstRate: z.coerce
    .number()
    .refine((v) => (GST_RATES as readonly number[]).includes(v), 'Choose a valid GST rate')
    .optional(),
  purchasePrice: money('Purchase price').default(0),
  sellingPrice: money('Selling price').refine((v) => v > 0, 'Selling price is required'),
  taxInclusive: z.boolean().default(true),
  unit: z.nativeEnum(Unit).default('MTR'),
  /** Off by default: most items are billed without counting stock */
  trackStock: z.boolean().default(false),
  lowStockThreshold: quantity('Low stock level').default(5),
  isActive: z.boolean().default(true),
};

export const createProductSchema = z.object({
  ...productFields,
  /** Stock on hand when the product is first added (recorded as OPENING in the ledger). */
  openingStock: quantity('Opening stock').default(0),
});

/** Stock is not editable here: it only changes through stock adjustments and bills. */
export const updateProductSchema = z.object(productFields);

export const productListQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  categoryId: z.union([z.literal('none'), z.coerce.number().int().positive()]).optional(),
  /** low = at/below minimum but not zero; out = zero or less */
  stock: z.enum(['all', 'low', 'out']).default('all'),
  /** true = only products whose stock is tracked (Inventory page) */
  tracked: z.enum(['true', 'false']).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  sort: z.enum(['name', 'stock', 'price', 'recent']).default('name'),
});

export const stockAdjustmentSchema = z.object({
  /** add = new stock received, remove = damaged/lost, set = physical count */
  mode: z.enum(['add', 'remove', 'set']),
  quantity: quantity('Quantity'),
  note: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === '' ? null : v))
    .nullish(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuery>;
export type StockAdjustmentBody = z.infer<typeof stockAdjustmentSchema>;
