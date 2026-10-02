import { z } from 'zod';
import { PaymentMode } from '@prisma/client';
import { paginationQuery } from '../../utils/pagination';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullish();

const itemSchema = z.object({
  /** Set when the line was picked from the product list (stock is reduced) */
  productId: z.coerce.number().int().positive().nullish(),
  /** विवरण — free text, as typed on the paper/Excel bill */
  description: z.string().trim().min(1, 'Enter the item name').max(150),
  /** नग */
  pieces: z.coerce.number().int().min(0).max(9999).default(1),
  /** मीटर/Ft. (or pieces for items not sold by length) */
  quantity: z.coerce
    .number({ invalid_type_error: 'Enter the quantity' })
    .positive('Quantity must be more than 0')
    .max(100000)
    .transform((v) => Math.round(v * 1000) / 1000),
  /** दर */
  rate: z.coerce
    .number({ invalid_type_error: 'Enter the rate' })
    .min(0)
    .max(10_000_000)
    .transform((v) => Math.round(v * 100) / 100),
});

/** YYYY-MM-DD in IST */
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date');

export const invoiceBodySchema = z.object({
  /** Leave blank for the next number automatically */
  invoiceNumber: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === '' || /^[A-Za-z0-9\-/]+$/.test(v), 'Use numbers, letters, - or /')
    .transform((v) => (v === '' ? null : v))
    .nullish(),
  invoiceDate: dateOnly,
  customerId: z.coerce.number().int().positive().nullish(),
  customerName: z.string().trim().max(120).default('Cash'),
  customerMobile: optionalText(15),
  discountPercent: z.coerce.number().min(0).max(100),
  paymentMode: z.nativeEnum(PaymentMode).default('CASH'),
  status: z.enum(['PAID', 'UNPAID']).default('PAID'),
  notes: optionalText(300),
  items: z.array(itemSchema).min(1, 'Add at least one item').max(100),
});

export const invoiceListQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  customerId: z.coerce.number().int().positive().optional(),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
});

export const lookupQuery = z.object({ q: z.string().trim().max(100).default('') });

export type InvoiceBody = z.infer<typeof invoiceBodySchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuery>;
