import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatQty } from '@/lib/format';
import type { LowStockItem } from '@/types/dashboard';

interface LowStockListProps {
  items: LowStockItem[] | undefined;
  total: number | undefined;
}

export function LowStockList({ items, total }: LowStockListProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Low stock</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {!items ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" aria-hidden />
            <p className="font-medium">All products are well stocked</p>
            <p className="text-sm text-muted-foreground">Items at or below their minimum stock will be listed here.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((p) => {
              const out = p.stockQuantity <= 0;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku} · min {formatQty(p.lowStockThreshold)}
                    </p>
                  </div>
                  <span
                    className={
                      out
                        ? 'flex shrink-0 items-center gap-1 text-sm font-semibold text-destructive'
                        : 'flex shrink-0 items-center gap-1 text-sm font-semibold text-[hsl(var(--warning))]'
                    }
                  >
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                    {out ? 'Out of stock' : `${formatQty(p.stockQuantity)} ${p.unit}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {items && total !== undefined && total > items.length && (
          <p className="mt-3 text-xs text-muted-foreground">+ {total - items.length} more items low on stock</p>
        )}
      </CardContent>
    </Card>
  );
}
