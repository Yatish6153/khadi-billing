/**
 * Bill helpers shared by the bill editor and the printed bill.
 * The live totals here only preview the bill; the server recalculates and
 * stores the authoritative figures when the bill is saved.
 */
import { formatBillDate, formatQty } from './format';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** 990 → "990.00" (as printed in the रकम column of the Excel bill) */
export const money2 = (n: number) => n.toFixed(2);

/** 360 → "360", 362.5 → "362.50" */
export const rateText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** 50 → "50", 12.5 → "12.5" */
export const percentText = (n: number) => String(Number(n.toFixed(2)));

export function billTotals(amounts: number[], discountPercent: number) {
  const subtotal = round2(amounts.reduce((s, a) => s + a, 0));
  const discount = round2((subtotal * discountPercent) / 100);
  return { subtotal, discount, net: round2(subtotal - discount) };
}

/** Today's date as YYYY-MM-DD in the browser's (shop's) time zone. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dateKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ShareableBill {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  subtotal: number;
  billDiscountPercent: number;
  discountTotal: number;
  grandTotal: number;
  items: { productName: string; pieces: number; quantity: number; rate: number; lineTotal: number }[];
}

/** Plain-text bill for WhatsApp. */
export function billShareText(bill: ShareableBill, shopName: string): string {
  const lines = [
    `*${shopName}*`,
    `क्रमांक: ${bill.invoiceNumber}   दिनांक: ${formatBillDate(bill.invoiceDate)}`,
    bill.customerName,
    '',
    ...bill.items.map((i) => `${i.productName} — ${formatQty(i.quantity)} × ${rateText(i.rate)} = ${money2(i.lineTotal)}`),
    '',
    `Total: ${money2(bill.subtotal)}`,
  ];
  if (bill.billDiscountPercent > 0) lines.push(`${percentText(bill.billDiscountPercent)}% Less: ${money2(bill.discountTotal)}`);
  lines.push(`*Total Net Pay: ₹${money2(bill.grandTotal)}*`, '', 'धन्यवाद 🙏');
  return lines.join('\n');
}

/** wa.me link; opens the chat with the customer when a 10-digit mobile is known. */
export function whatsappLink(text: string, mobile?: string | null): string {
  const digits = mobile?.replace(/\D/g, '').slice(-10);
  const to = digits && digits.length === 10 ? `91${digits}` : '';
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
