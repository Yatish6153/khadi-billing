import type { BadgeProps } from '@/components/ui/badge';
import type { InvoiceStatus, PaymentMode } from '@/types/dashboard';

/** Bill status → badge text + colour (status colours always come with a label). */
export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; variant: BadgeProps['variant'] }> = {
  PAID: { label: 'Paid', variant: 'success' },
  UNPAID: { label: 'Unpaid', variant: 'warning' },
  PARTIAL: { label: 'Partial', variant: 'warning' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export const PAYMENT_MODE: Record<PaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank',
  CREDIT: 'Credit',
};
