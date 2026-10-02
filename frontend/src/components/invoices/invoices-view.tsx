'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, FilePlus2, FileText, MoreHorizontal, Pencil, Printer, Search, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { todayKey } from '@/lib/bill';
import { formatBillDate, formatINR } from '@/lib/format';
import { INVOICE_STATUS, PAYMENT_MODE } from '@/lib/invoice-labels';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import type { InvoiceList, InvoiceListRow } from '@/types/invoice';
import { Badge } from '@/components/ui/badge';
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
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 25;

function monthStartKey() {
  const k = todayKey();
  return `${k.slice(0, 8)}01`;
}

const PRESETS = [
  { label: 'Today', from: todayKey, to: todayKey },
  { label: 'This month', from: monthStartKey, to: todayKey },
  { label: 'All', from: () => '', to: () => '' },
] as const;

/** Bill history with search, date filter and quick actions. */
export function InvoicesView() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [deleting, setDeleting] = React.useState<InvoiceListRow | null>(null);
  const debouncedSearch = useDebounce(search.trim());

  React.useEffect(() => setPage(1), [debouncedSearch, from, to]);

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debouncedSearch) query.set('search', debouncedSearch);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const { data, error, loading, reload } = useApi<InvoiceList>(`/invoices?${query}`);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/invoices/${deleting.id}`, { method: 'DELETE' });
      toast.success(`Bill ${deleting.invoiceNumber} deleted`);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the bill');
      throw err;
    }
  };

  const filtered = !!debouncedSearch || !!from || !!to;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill no., customer or mobile"
              className="pl-9"
              aria-label="Search bills"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
          <div className="flex gap-1">
            {PRESETS.map((p) => {
              const active = from === p.from() && to === p.to();
              return (
                <Button
                  key={p.label}
                  size="sm"
                  variant={active ? 'secondary' : 'ghost'}
                  className={cn(active && 'font-semibold')}
                  onClick={() => {
                    setFrom(p.from());
                    setTo(p.to());
                  }}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
        </div>
        <Button asChild>
          <Link href="/billing/new">
            <FilePlus2 /> New bill
          </Link>
        </Button>
      </div>

      {data && data.total > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data.total}</span> {data.total === 1 ? 'bill' : 'bills'} ·{' '}
          <span className="font-semibold text-foreground">{formatINR(data.totalAmount)}</span> total net pay
        </p>
      )}

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <Card>
        {!data ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : data.total === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">{filtered ? 'No bills match these filters' : 'No bills yet'}</p>
            {!filtered && (
              <Button asChild>
                <Link href="/billing/new">
                  <FilePlus2 /> Make your first bill
                </Link>
              </Button>
            )}
          </CardContent>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium sm:px-6">Bill No.</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="hidden px-3 py-3 text-right font-medium md:table-cell">Items</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Payment</th>
                  <th className="px-3 py-3 text-right font-medium">Net Pay</th>
                  <th className="w-12 px-3 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold tabular-nums sm:px-6">{inv.invoiceNumber}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatBillDate(inv.invoiceDate)}</td>
                    <td className="max-w-[14rem] px-3 py-2.5">
                      <p className="truncate">{inv.customerName}</p>
                      {inv.customerMobile && <p className="text-xs text-muted-foreground">{inv.customerMobile}</p>}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{inv.itemCount}</td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      {inv.status === 'PAID' ? (
                        <span className="text-muted-foreground">{PAYMENT_MODE[inv.paymentMode]}</span>
                      ) : (
                        <Badge variant={INVOICE_STATUS[inv.status].variant}>{INVOICE_STATUS[inv.status].label}</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{formatINR(inv.grandTotal)}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for bill ${inv.invoiceNumber}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => router.push(`/invoices/${inv.id}`)}>
                            <Eye /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => router.push(`/invoices/${inv.id}?print=1`)}>
                            <Printer /> Reprint
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => router.push(`/invoices/${inv.id}/edit`)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setDeleting(inv)} className="text-destructive focus:text-destructive">
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

      {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} noun="bills" />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete bill ${deleting?.invoiceNumber ?? ''}?`}
        description="The bill will be removed from sales and reports, and any stock it used will be added back."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
