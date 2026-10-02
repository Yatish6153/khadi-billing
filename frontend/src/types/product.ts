import type { Unit } from './dashboard';

export interface Category {
  id: number;
  name: string;
  description: string | null;
  productCount: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: number | null;
  category: { id: number; name: string } | null;
  hsnCode: string | null;
  gstRate: number;
  purchasePrice: number;
  sellingPrice: number;
  taxInclusive: boolean;
  unit: Unit;
  /** false = stock isn't counted for this item */
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'OPENING' | 'PURCHASE' | 'SALE' | 'SALE_REVERSAL' | 'ADJUSTMENT';

export interface StockMovement {
  id: number;
  productId: number;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  invoiceId: number | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
}

/** Response of GET /api/products/stock-summary */
export interface StockSummary {
  products: number;
  costValue: number;
  sellingValue: number;
  lowStock: number;
  outOfStock: number;
}
