'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import type { Customer, CustomerWithStats, Paginated } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerFormDialog } from './customer-form-dialog';

const PAGE_SIZE = 20;

export function CustomersView() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const debouncedSearch = useDebounce(search.trim());

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [deleting, setDeleting] = React.useState<CustomerWithStats | null>(null);

  // Go back to page 1 whenever the search text changes
  React.useEffect(() => setPage(1), [debouncedSearch]);

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debouncedSearch) query.set('search', debouncedSearch);
  const { data, error, loading, reload } = useApi<Paginated<CustomerWithStats>>(`/customers?${query}`);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/customers/${deleting.id}`, { method: 'DELETE' });
      toast.success(`${deleting.name} deleted`);
      // Step back a page if we just emptied the last one
      if (data && data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete customer');
      throw err;
    }
  };

  const hasNoCustomersAtAll = data && data.total === 0 && !debouncedSearch;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, mobile, GSTIN or city"
            className="pl-9"
            aria-label="Search customers"
          />
        </div>
        <Button onClick={openAdd}>
          <Plus /> Add customer
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden /> {error}
            </span>
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        {!data ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : hasNoCustomersAtAll ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-medium">No customers yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Save regular customers to fill their details on bills in one click. Walk-in sales can simply be billed
                as <strong>Cash</strong>.
              </p>
            </div>
            <Button onClick={openAdd}>
              <Plus /> Add your first customer
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No customers match “{debouncedSearch}”.
          </p>
        ) : (
          <div className={loading ? 'overflow-x-auto opacity-60 transition-opacity' : 'overflow-x-auto'}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium sm:px-6">Name</th>
                  <th className="px-3 py-3 font-medium">Mobile</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">City</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">GSTIN</th>
                  <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Bills</th>
                  <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Total purchase</th>
                  <th className="w-12 px-3 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <p className="font-medium">{c.name}</p>
                      {c.city && <p className="text-xs text-muted-foreground md:hidden">{c.city}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">{c.mobile ?? '—'}</td>
                    <td className="hidden px-3 py-3 md:table-cell">{c.city ?? '—'}</td>
                    <td className="hidden px-3 py-3 font-mono text-xs lg:table-cell">{c.gstNumber ?? '—'}</td>
                    <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{c.stats.bills}</td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums sm:table-cell">
                      {formatINR(c.stats.total)}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${c.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => router.push(`/customers/${c.id}`)}>
                            <Eye /> View history
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(c)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setDeleting(c)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} noun="customers" />
      )}

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editing} onSaved={reload} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'customer'}?`}
        description={
          deleting && deleting.stats.bills > 0 ? (
            <>
              Their <strong>{deleting.stats.bills} bills</strong> will be kept with the customer details printed on
              them, but won&apos;t appear under a customer any more. This can&apos;t be undone.
            </>
          ) : (
            'This customer has no bills. This can’t be undone.'
          )
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
