'use client';

import * as React from 'react';
import { useApi } from '@/hooks/use-api';
import { formatQty } from '@/lib/format';
import { MOVEMENT_LABEL } from '@/lib/products';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types/customer';
import type { Product, StockMovement } from '@/types/product';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 15;

function History({ product }: { product: Product }) {
  const [page, setPage] = React.useState(1);
  const { data } = useApi<Paginated<StockMovement>>(`/products/${product.id}/stock-movements?page=${page}&pageSize=${PAGE_SIZE}`);

  if (!data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (data.total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No stock changes recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Change</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m.id} className="border-b last:border-0 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td className="px-3 py-2">
                  {MOVEMENT_LABEL[m.type]}
                  {(m.note || m.reference) && (
                    <p className="text-xs text-muted-foreground">{[m.reference, m.note].filter(Boolean).join(' · ')}</p>
                  )}
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                    m.quantity < 0 ? 'text-destructive' : 'text-[hsl(var(--success))]',
                  )}
                >
                  {m.quantity > 0 ? '+' : ''}
                  {formatQty(m.quantity)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatQty(m.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} noun="changes" />
    </div>
  );
}

/** Every stock change for one product: opening, received, sold, adjusted. */
export function StockHistoryDialog({ product, onOpenChange }: { product: Product | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stock history</DialogTitle>
          <DialogDescription>
            {product?.name} · now {product ? `${formatQty(product.stockQuantity)} ${product.unit}` : ''}
          </DialogDescription>
        </DialogHeader>
        {product && <History key={product.id} product={product} />}
      </DialogContent>
    </Dialog>
  );
}
