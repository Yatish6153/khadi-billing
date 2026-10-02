import { Badge } from '@/components/ui/badge';
import { stockLevel } from '@/lib/products';

const LEVELS = {
  out: { label: 'Out of stock', variant: 'destructive' },
  low: { label: 'Low stock', variant: 'warning' },
  ok: { label: 'In stock', variant: 'success' },
} as const;

export function StockBadge({ product }: { product: { stockQuantity: number; lowStockThreshold: number } }) {
  const level = LEVELS[stockLevel(product)];
  return <Badge variant={level.variant}>{level.label}</Badge>;
}
