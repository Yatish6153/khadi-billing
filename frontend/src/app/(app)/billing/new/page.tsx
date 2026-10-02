import type { Metadata } from 'next';
import { NewBillLoader } from '@/components/billing/bill-editor-loader';

export const metadata: Metadata = { title: 'New Bill' };

export default function NewBillPage() {
  return <NewBillLoader />;
}
