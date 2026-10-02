import type { InvoiceStatus, PaymentMode } from './dashboard';

export interface CustomerStats {
  bills: number;
  total: number;
  lastPurchase: string | null;
}

export interface Customer {
  id: number;
  name: string;
  mobile: string | null;
  email: string | null;
  gstNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  stateCode: string | null;
  pincode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithStats extends Customer {
  stats: CustomerStats;
}

export interface CustomerInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number;
  status: InvoiceStatus;
  paymentMode: PaymentMode;
  itemCount: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
