'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Boxes, History, IndianRupee, PackageX, Search, Tag } from 'lucide-react';
import { formatINR, formatQty } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import type { Paginated } from '@/types/customer';
import type { Product, StockSummary } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/stat-card';
import { ProductThumb } from '@/components/products/product-thumb';
import { StockAdjustDialog } from '@/components/products/stock-adjust-dialog';
import { StockBadge } from '@/components/products/stock-badge';
import { StockHistoryDialog } from '@/components/products/stock-history-dialog';

const PAGE_SIZE = 25;
const TABS = [
  { value: 'all', label: 'All stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
] as const;
type Tab = (typeof TABS)[number]['value'];

/** Current stock of every active product, with alerts and quick adjustments. */
export function InventoryView() {
  const [tab, setTab] = React.useState<Tab>('all');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const debouncedSearch = useDebounce(search.trim());
  const [adjusting, setAdjusting] = React.useState<Product | null>(null);
  const [historyOf, setHistoryOf] = React.useState<Product | null>(null);

  React.useEffect(() => setPage(1), [tab, debouncedSearch]);

  // Only products with "Track stock" switched on appear here
  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), stock: tab, sort: 'stock', tracked: 'true' });
  if (debouncedSearch) query.set('search', debouncedSearch);

  const list = useApi<Paginated<Product>>(`/products?${query}`);
  const summary = useApi<StockSummary>('/products/stock-summary');
  const s = summary.data;

  const refreshAll = () => {
    list.reload();
    summary.reload();
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Stock summary">
        <StatCard
          label="Stock value (cost)"
          icon={IndianRupee}
          loading={!s}
          value={formatINR(s?.costValue ?? 0, { whole: true })}
          sub={s ? `${s.products} active products` : undefined}
        />
        <StatCard
          label="Stock value (selling)"
          icon={Tag}
          loading={!s}
          value={formatINR(s?.sellingValue ?? 0, { whole: true })}
          sub="at current selling prices"
        />
        <StatCard
          label="Low stock"
          icon={AlertTriangle}
          loading={!s}
          value={String(s?.lowStock ?? 0)}
          tone={s && s.lowStock > 0 ? 'warning' : 'default'}
          sub="at or below alert level"
        />
        <StatCard
          label="Out of stock"
          icon={PackageX}
          loading={!s}
          value={String(s?.outOfStock ?? 0)}
          tone={s && s.outOfStock > 0 ? 'warning' : 'default'}
          sub="need restocking now"
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full rounded-md border bg-muted/50 p-0.5 sm:w-auto" role="tablist" aria-label="Stock filter">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
                tab === t.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
      </div>

      {list.error && <ErrorBanner message={list.error} onRetry={list.reload} />}

      <Card>
        {!list.data ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : list.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm">
            <Boxes className="h-8 w-8 text-muted-foreground" aria-hidden />
            {tab === 'all' && !debouncedSearch ? (
              <>
                <p className="font-medium">No items are tracking stock</p>
                <p className="max-w-md text-muted-foreground">
                  Stock is off for all products, so nothing needs counting. To count stock for an item, open it on the{' '}
                  <Link href="/products" className="text-primary underline-offset-4 hover:underline">
                    Products
                  </Link>{' '}
                  page → More options → tick “Track stock”.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                {tab === 'low' ? 'No products are low on stock.' : tab === 'out' ? 'Nothing is out of stock.' : 'No products match.'}
              </p>
            )}
          </div>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', list.loading && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium sm:px-6">Product</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Category</th>
                  <th className="px-3 py-3 text-right font-medium">In stock</th>
                  <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Alert at</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell">Status</th>
                  <th className="hidden px-3 py-3 text-right font-medium lg:table-cell">Value (cost)</th>
                  <th className="px-3 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <ProductThumb src={p.imageUrl} name={p.name} className="h-9 w-9" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">{p.category?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatQty(p.stockQuantity)} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {formatQty(p.lowStockThreshold)}
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <StockBadge product={p} />
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums lg:table-cell">
                      {formatINR(Math.max(p.stockQuantity, 0) * p.purchasePrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => setAdjusting(p)}>
                        Adjust
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-9 w-9"
                        onClick={() => setHistoryOf(p)}
                        aria-label={`Stock history of ${p.name}`}
                      >
                        <History />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {list.data && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={setPage} noun="products" />
      )}

      <StockAdjustDialog product={adjusting} onOpenChange={(o) => !o && setAdjusting(null)} onSaved={refreshAll} />
      <StockHistoryDialog product={historyOf} onOpenChange={(o) => !o && setHistoryOf(null)} />
    </div>
  );
}
