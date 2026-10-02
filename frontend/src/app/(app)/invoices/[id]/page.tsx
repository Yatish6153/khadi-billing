import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InvoiceView } from '@/components/invoices/invoice-view';

export const metadata: Metadata = { title: 'Bill' };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) notFound();
  return (
    <Suspense>
      <InvoiceView id={invoiceId} />
    </Suspense>
  );
}
