'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, FilePlus2, MessageCircle, Pencil, Printer, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { billShareText, whatsappLink } from '@/lib/bill';
import { useApi } from '@/hooks/use-api';
import type { Invoice, ShopSettings } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BillSheet } from './bill-sheet';

/** One saved bill: print preview plus Print / WhatsApp / Edit / Delete. */
export function InvoiceView({ id }: { id: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: invoice, error } = useApi<Invoice>(`/invoices/${id}`);
  const { data: settings } = useApi<ShopSettings>('/settings');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const printed = React.useRef(false);

  // Opened from "Save & Print": show the print dialog once the bill has rendered
  React.useEffect(() => {
    if (!invoice || !settings || printed.current || searchParams.get('print') !== '1') return;
    printed.current = true;
    router.replace(`/invoices/${id}`, { scroll: false });
    const img = document.querySelector<HTMLImageElement>('.bill-sheet img');
    const go = () => setTimeout(() => window.print(), 150);
    if (img && !img.complete) img.addEventListener('load', go, { once: true });
    else go();
  }, [invoice, settings, searchParams, router, id]);

  if (error && !invoice) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="font-medium">{error}</p>
          <Button variant="outline" asChild>
            <Link href="/invoices">
              <ArrowLeft /> All bills
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const deleteBill = async () => {
    try {
      await api(`/invoices/${id}`, { method: 'DELETE' });
      toast.success(`Bill ${invoice?.invoiceNumber} deleted. Stock has been returned.`);
      router.replace('/invoices');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the bill');
      throw err;
    }
  };

  const share = () => {
    if (!invoice || !settings) return;
    window.open(whatsappLink(billShareText(invoice, settings.shopName), invoice.customerMobile), '_blank', 'noopener');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All bills
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()} disabled={!invoice || !settings}>
            <Printer /> Print / Save PDF
          </Button>
          <Button variant="outline" onClick={share} disabled={!invoice || !settings}>
            <MessageCircle /> WhatsApp
          </Button>
          <Button variant="outline" asChild disabled={!invoice}>
            <Link href={`/invoices/${id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={!invoice}
          >
            <Trash2 /> Delete
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/billing/new">
              <FilePlus2 /> New bill
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground print:hidden">
        To save a PDF: click <strong>Print / Save PDF</strong> and choose <strong>Save as PDF</strong> as the printer.
      </p>

      {/* Scrolls sideways on phones; prints at full A4 size */}
      <div className="overflow-x-auto rounded-lg bg-muted/40 p-2 sm:p-6 print:!mt-0 print:overflow-visible print:bg-transparent print:p-0">
        {invoice && settings ? (
          <div className="print-area w-max mx-auto shadow-md print:w-auto print:shadow-none">
            <BillSheet invoice={invoice} settings={settings} />
          </div>
        ) : (
          <Skeleton className="mx-auto h-[600px] w-full max-w-[720px]" />
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete bill ${invoice?.invoiceNumber ?? ''}?`}
        description="The bill will be removed from sales and reports, and any stock it used will be added back."
        onConfirm={deleteBill}
      />
    </div>
  );
}
