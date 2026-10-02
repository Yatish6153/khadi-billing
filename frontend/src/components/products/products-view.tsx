'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Boxes, History, MoreHorizontal, Package, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatINR, formatQty } from '@/lib/format';
import { stockLevel } from '@/lib/products';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import type { Paginated } from '@/types/customer';
import type { Category, Product } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoriesDialog } from './categories-dialog';
import { ProductFormDialog } from './product-form-dialog';
import { ProductThumb } from './product-thumb';
import { StockAdjustDialog } from './stock-adjust-dialog';
import { StockHistoryDialog } from './stock-history-dialog';

const PAGE_SIZE = 20;

export function ProductsView() {
  const [search, setSearch] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [status, setStatus] = React.useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = React.useState(1);
  const debouncedSearch = useDebounce(search.trim());

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [adjusting, setAdjusting] = React.useState<Product | null>(null);
  const [historyOf, setHistoryOf] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState<Product | null>(null);
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);

  React.useEffect(() => setPage(1), [debouncedSearch, categoryId, status]);

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status });
  if (debouncedSearch) query.set('search', debouncedSearch);
  if (categoryId) query.set('categoryId', categoryId);

  const { data, error, loading, reload } = useApi<Paginated<Product>>(`/products?${query}`);
  const categories = useApi<Category[]>('/categories');

  const isFiltered = !!debouncedSearch || !!categoryId || status !== 'active';
  /** The Stock column only appears when some product tracks stock */
  const anyTracked = !!data?.items.some((p) => p.trackStock);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const res = await api<{ action: 'deleted' | 'deactivated' }>(`/products/${deleting.id}`, { method: 'DELETE' });
      toast.success(
        res.action === 'deleted'
          ? `${deleting.name} deleted`
          : `${deleting.name} is on old bills, so it was made inactive instead of deleted`,
      );
      reload();
      categories.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete product');
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode, HSN"
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <NativeSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category" className="sm:w-48">
              <option value="">All categories</option>
              <option value="none">Uncategorised</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status" className="sm:w-32">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </NativeSelect>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
            <Tags /> Categories
          </Button>
          <Button onClick={openAdd} className="flex-1 sm:flex-none">
            <Plus /> Add product
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <Card>
        {!data ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.total === 0 && !isFiltered ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Package className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-medium">No products yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add the items you sell with their rate. They will appear in the item list when you make a bill, so you
                don&apos;t have to type them.
              </p>
            </div>
            <Button onClick={openAdd}>
              <Plus /> Add your first product
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">No products match these filters.</p>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium sm:px-6">Product</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Category</th>
                  <th className="px-3 py-3 text-right font-medium">Rate</th>
                  {anyTracked && <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Stock</th>}
                  <th className="w-12 px-3 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const level = stockLevel(p);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2.5 sm:px-6">
                        <div className="flex items-center gap-3">
                          <ProductThumb src={p.imageUrl} name={p.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {p.name}
                              {!p.isActive && (
                                <Badge variant="outline" className="ml-2 align-middle">
                                  Inactive
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        {p.category?.name ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums">
                        {formatINR(p.sellingPrice)}
                      </td>
                      {anyTracked && (
                        <td
                          className={cn(
                            'hidden whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums sm:table-cell',
                            p.trackStock && level === 'out' && 'text-destructive',
                            p.trackStock && level === 'low' && 'text-[hsl(var(--warning))]',
                          )}
                        >
                          {p.trackStock ? (
                            <>
                              {formatQty(p.stockQuantity)} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                            </>
                          ) : (
                            <span className="font-normal text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${p.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            {p.trackStock && (
                              <>
                                <DropdownMenuItem onSelect={() => setAdjusting(p)}>
                                  <Boxes /> Adjust stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setHistoryOf(p)}>
                                  <History /> Stock history
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setDeleting(p)} className="text-destructive focus:text-destructive">
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} noun="products" />}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories.data ?? []}
        onSaved={() => {
          reload();
          categories.reload();
        }}
      />
      <StockAdjustDialog product={adjusting} onOpenChange={(o) => !o && setAdjusting(null)} onSaved={reload} />
      <StockHistoryDialog product={historyOf} onOpenChange={(o) => !o && setHistoryOf(null)} />
      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories.data ?? []}
        onChanged={() => {
          categories.reload();
          reload();
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'product'}?`}
        description="If this product is on any bill it will be made inactive instead, so old bills and reports stay correct."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
