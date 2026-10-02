'use client';

import { useApi } from '@/hooks/use-api';
import type { Invoice, ShopSettings } from '@/types/invoice';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { BillEditor } from './bill-editor';

function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

/** New bill: loads shop settings (next bill number, default % Less) first. */
export function NewBillLoader() {
  const settings = useApi<ShopSettings>('/settings');
  if (settings.error) return <ErrorBanner message={settings.error} onRetry={settings.reload} />;
  if (!settings.data) return <Loading />;
  return <BillEditor settings={settings.data} />;
}

/** Edit bill: loads the bill and the settings. */
export function EditBillLoader({ id }: { id: number }) {
  const settings = useApi<ShopSettings>('/settings');
  const invoice = useApi<Invoice>(`/invoices/${id}`);
  const error = settings.error ?? invoice.error;
  if (error) return <ErrorBanner message={error} onRetry={() => (settings.reload(), invoice.reload())} />;
  if (!settings.data || !invoice.data) return <Loading />;
  return <BillEditor settings={settings.data} invoice={invoice.data} />;
}
