import { Prisma } from '@prisma/client';
import { amountInWords } from '../../utils/amount-in-words';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const round2 = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export interface CalcLine {
  /** Billed quantity: metres/feet for cloth, otherwise pieces (मीटर/Ft. column) */
  quantity: number;
  rate: number;
  /** GST % included in the rate */
  gstRate: number;
}

export interface CalcInput {
  lines: CalcLine[];
  /** Whole-bill discount, e.g. 50 for "50% Less" */
  discountPercent: number;
  /** Customer in another state → IGST instead of CGST + SGST */
  interState: boolean;
}

/**
 * Works out a bill exactly like the shop's Excel sheet:
 *   रकम = quantity × rate, subtotal = Σ रकम, "X% Less" = subtotal × X%,
 *   Total Net Pay = subtotal − discount.
 * Rates include GST, so the GST inside each line (after its share of the
 * discount) is extracted for the GST report. All maths uses Decimal to avoid
 * floating-point paise errors.
 */
export function calculateInvoice({ lines, discountPercent, interState }: CalcInput) {
  const pct = D(discountPercent);
  const amounts = lines.map((l) => round2(D(l.quantity).times(l.rate)));
  const subtotal = amounts.reduce((sum, a) => sum.plus(a), D(0));
  const discountTotal = round2(subtotal.times(pct).dividedBy(100));
  const grandTotal = subtotal.minus(discountTotal);

  // Spread the bill discount over the lines; the last line absorbs rounding.
  let discountLeft = discountTotal;
  const items = lines.map((line, i) => {
    const amount = amounts[i]!;
    const isLast = i === lines.length - 1;
    const lineDiscount = isLast ? discountLeft : round2(amount.times(pct).dividedBy(100));
    discountLeft = discountLeft.minus(lineDiscount);

    const net = amount.minus(lineDiscount);
    const taxableValue = round2(net.dividedBy(D(1).plus(D(line.gstRate).dividedBy(100))));
    const tax = net.minus(taxableValue);
    const cgst = interState ? D(0) : round2(tax.dividedBy(2));
    const sgst = interState ? D(0) : tax.minus(cgst);
    const igst = interState ? tax : D(0);

    return {
      lineTotal: amount,
      discountPercent: pct,
      discountAmount: lineDiscount,
      taxableValue,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
    };
  });

  const sum = (key: 'taxableValue' | 'cgstAmount' | 'sgstAmount' | 'igstAmount') =>
    items.reduce((total, it) => total.plus(it[key]), D(0));

  return {
    items,
    subtotal,
    billDiscountPercent: pct,
    discountTotal,
    taxableAmount: sum('taxableValue'),
    cgstTotal: sum('cgstAmount'),
    sgstTotal: sum('sgstAmount'),
    igstTotal: sum('igstAmount'),
    roundOff: D(0),
    grandTotal,
    amountInWords: amountInWords(grandTotal.toNumber()),
  };
}
