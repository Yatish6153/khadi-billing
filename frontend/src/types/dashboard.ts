export type InvoiceStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT';
export type Unit = 'PCS' | 'MTR' | 'FT' | 'KG' | 'GM' | 'LTR' | 'SET' | 'PAIR' | 'BOX';

export interface DailySales {
  /** YYYY-MM-DD, IST */
  date: string;
  sales: number;
  bills: number;
}

export interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  unit: Unit;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface RecentInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  grandTotal: number;
  status: InvoiceStatus;
  paymentMode: PaymentMode;
}

/** Response of GET /api/dashboard/summary */
export interface DashboardSummary {
  today: { sales: number; bills: number };
  month: { sales: number; bills: number };
  totalCustomers: number;
  totalProducts: number;
  lowStock: { count: number; items: LowStockItem[] };
  recentInvoices: RecentInvoice[];
  salesTrend: DailySales[];
}
