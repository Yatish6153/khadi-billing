import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditBillLoader } from '@/components/billing/bill-editor-loader';

export const metadata: Metadata = { title: 'Edit Bill' };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) notFound();
  return <EditBillLoader id={invoiceId} />;
}
