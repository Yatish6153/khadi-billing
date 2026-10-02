import type { InvoiceStatus, PaymentMode, Unit } from './dashboard';

export interface InvoiceItem {
  id: number;
  productId: number | null;
  productName: string;
  sku: string | null;
  hsnCode: string | null;
  unit: Unit;
  pieces: number;
  quantity: number;
  rate: number;
  gstRate: number;
  lineTotal: number;
  discountAmount: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: number | null;
  customerName: string;
  customerMobile: string | null;
  customerGstin: string | null;
  customerAddress: string | null;
  customerState: string | null;
  isInterState: boolean;
  subtotal: number;
  billDiscountPercent: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  amountInWords: string;
  paymentMode: PaymentMode;
  status: InvoiceStatus;
  notes: string | null;
  items: InvoiceItem[];
}

export interface InvoiceListRow {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerMobile: string | null;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  status: InvoiceStatus;
  itemCount: number;
}

export interface InvoiceList {
  items: InvoiceListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalAmount: number;
}

export interface ItemLookup {
  products: {
    id: number;
    name: string;
    sku: string;
    unit: Unit;
    sellingPrice: number;
    stockQuantity: number;
    trackStock: boolean;
  }[];
  history: { name: string; rate: number }[];
}

export interface SaveInvoiceResult {
  id: number;
  invoiceNumber: string;
  warnings: string[];
}

export interface ShopSettings {
  shopName: string;
  gstNumber: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  invoiceFooter: string | null;
  termsAndConditions: string | null;
  defaultDiscountPercent: number;
  defaultGstRate: number;
  logoUrl: string | null;
}
