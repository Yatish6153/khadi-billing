import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CustomerDetailView } from '@/components/customers/customer-detail-view';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) notFound();
  return <CustomerDetailView id={customerId} />;
}
