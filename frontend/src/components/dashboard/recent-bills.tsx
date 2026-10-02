import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBillDate, formatINR } from '@/lib/format';
import { INVOICE_STATUS as STATUS, PAYMENT_MODE as PAYMENT } from '@/lib/invoice-labels';
import type { RecentInvoice } from '@/types/dashboard';

export function RecentBills({ invoices }: { invoices: RecentInvoice[] | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent bills</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {!invoices ? (
          <div className="space-y-3 px-6 pb-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 pb-8 pt-4 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">No bills yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Bills appear here as soon as you create them from <strong>New Bill</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-2 font-medium">Bill No.</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Payment</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Status</th>
                  <th className="px-6 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-6 py-2.5 font-medium tabular-nums">
                      <Link href={`/invoices/${inv.id}`} className="text-primary hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatBillDate(inv.invoiceDate)}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5">{inv.customerName}</td>
                    <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">{PAYMENT[inv.paymentMode]}</td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <Badge variant={STATUS[inv.status].variant}>{STATUS[inv.status].label}</Badge>
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
  );
}
