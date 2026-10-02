import type { Unit } from '@/types/dashboard';
import type { StockMovementType } from '@/types/product';

/** Units offered in the product form. Fabric is usually sold by the metre. */
export const UNITS: { value: Unit; label: string }[] = [
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'MTR', label: 'Metre (MTR)' },
  { value: 'FT', label: 'Feet (FT)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'GM', label: 'Gram (GM)' },
  { value: 'LTR', label: 'Litre (LTR)' },
  { value: 'SET', label: 'Set' },
  { value: 'PAIR', label: 'Pair' },
  { value: 'BOX', label: 'Box' },
];

/** Must match GST_RATES in backend/src/modules/products/product.schema.ts */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40] as const;

export const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  OPENING: 'Opening stock',
  PURCHASE: 'Stock added',
  SALE: 'Sold',
  SALE_REVERSAL: 'Bill cancelled',
  ADJUSTMENT: 'Adjusted',
};

export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(p: { stockQuantity: number; lowStockThreshold: number }): StockLevel {
  if (p.stockQuantity <= 0) return 'out';
  if (p.stockQuantity <= p.lowStockThreshold) return 'low';
  return 'ok';
}

/** Splits a price into base + GST, depending on whether it already includes GST. */
export function splitGst(price: number, rate: number, inclusive: boolean) {
  const base = inclusive ? price / (1 + rate / 100) : price;
  const gst = base * (rate / 100);
  return { base: Math.round(base * 100) / 100, gst: Math.round(gst * 100) / 100, total: Math.round((base + gst) * 100) / 100 };
}
