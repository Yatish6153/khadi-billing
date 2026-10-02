'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Mail, MapPin, Pencil, Phone, Receipt, StickyNote, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatBillDate, formatINR } from '@/lib/format';
import { INVOICE_STATUS, PAYMENT_MODE } from '@/lib/invoice-labels';
import { useApi } from '@/hooks/use-api';
import type { CustomerInvoice, CustomerWithStats, Paginated } from '@/types/customer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerFormDialog } from './customer-form-dialog';

const PAGE_SIZE = 15;

function DetailRow({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function CustomerDetailView({ id }: { id: number }) {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const customer = useApi<CustomerWithStats>(`/customers/${id}`);
  const history = useApi<Paginated<CustomerInvoice>>(`/customers/${id}/invoices?page=${page}&pageSize=${PAGE_SIZE}`);

  const c = customer.data;

  if (customer.error && !c) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="font-medium">{customer.error}</p>
          <Button variant="outline" asChild>
            <Link href="/customers">
              <ArrowLeft /> Back to customers
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const deleteCustomer = async () => {
    try {
      await api(`/customers/${id}`, { method: 'DELETE' });
      toast.success(`${c?.name ?? 'Customer'} deleted`);
      router.replace('/customers');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete customer');
      throw err;
    }
  };

  const address = c ? [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/customers"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Customers
          </Link>
          {c ? (
            <h2 className="truncate text-2xl font-semibold tracking-tight">{c.name}</h2>
          ) : (
            <Skeleton className="h-8 w-56" />
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)} disabled={!c}>
            <Pencil /> Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={!c}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!c ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-5 w-full" />)
            ) : (
              <>
                <DetailRow icon={Phone}>{c.mobile ?? <span className="text-muted-foreground">No mobile</span>}</DetailRow>
                <DetailRow icon={Receipt}>
                  {c.gstNumber ? (
                    <span className="font-mono">{c.gstNumber}</span>
                  ) : (
                    <span className="text-muted-foreground">No GSTIN (unregistered)</span>
                  )}
                </DetailRow>
                <DetailRow icon={MapPin}>
                  {address || <span className="text-muted-foreground">No address</span>}
                  {c.stateCode && <span className="text-muted-foreground"> · State code {c.stateCode}</span>}
                </DetailRow>
                {c.email && <DetailRow icon={Mail}>{c.email}</DetailRow>}
                {c.notes && <DetailRow icon={StickyNote}>{c.notes}</DetailRow>}
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 lg:col-span-2">
          {[
            { label: 'Total bills', value: c ? String(c.stats.bills) : null },
            { label: 'Total purchases', value: c ? formatINR(c.stats.total, { whole: true }) : null },
            { label: 'Last purchase', value: c ? (c.stats.lastPurchase ? formatBillDate(c.stats.lastPurchase) : '—') : null },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">{s.label}</p>
                {s.value === null ? (
                  <Skeleton className="mt-2 h-7 w-20" />
                ) : (
                  <p className="mt-1 truncate text-lg font-semibold tabular-nums sm:text-2xl">{s.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Purchase history</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {!history.data ? (
            <div className="space-y-3 px-6 pb-4">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : history.data.total === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 pb-8 pt-4 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="font-medium">No bills for this customer yet</p>
              <p className="text-sm text-muted-foreground">Bills made for {c?.name ?? 'them'} will be listed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Bill No.</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Items</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Payment</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-6 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="whitespace-nowrap px-6 py-2.5 font-medium tabular-nums">
                        <Link href={`/invoices/${inv.id}`} className="text-primary hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatBillDate(inv.invoiceDate)}</td>
                      <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{inv.itemCount}</td>
                      <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">{PAYMENT_MODE[inv.paymentMode]}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={INVOICE_STATUS[inv.status].variant}>{INVOICE_STATUS[inv.status].label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-2.5 text-right font-medium tabular-nums">
                        {formatINR(inv.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {history.data && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={history.data.total} onPageChange={setPage} noun="bills" />
      )}

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={c} onSaved={customer.reload} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${c?.name ?? 'customer'}?`}
        description={
          c && c.stats.bills > 0 ? (
            <>
              Their <strong>{c.stats.bills} bills</strong> will be kept with the customer details printed on them, but
              won&apos;t appear under a customer any more. This can&apos;t be undone.
            </>
          ) : (
            'This customer has no bills. This can’t be undone.'
          )
        }
        onConfirm={deleteCustomer}
      />
    </div>
  );
}
