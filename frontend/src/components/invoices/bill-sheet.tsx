import { money2, percentText, rateText } from '@/lib/bill';
import { formatBillDate, formatQty } from '@/lib/format';
import type { Invoice, ShopSettings } from '@/types/invoice';

/** Minimum item rows, so short bills keep the Excel bill's look. */
const MIN_ROWS = 12;
const GRID = 'grid grid-cols-[minmax(0,1fr)_14mm_24mm_24mm_32mm]';
const CELL = 'border-r border-black px-[2mm] last:border-r-0';

const DEFAULT_TERMS = ['बिका हुआ माल वापिस नहीं लिया जायेगा', 'भूल चुक लेनी देनी'];

/**
 * The printed bill: an A4 replica of the shop's Excel bill.
 * Always black on white, whatever the app theme.
 */
export function BillSheet({ invoice, settings }: { invoice: Invoice; settings: ShopSettings }) {
  const terms = settings.termsAndConditions?.split('\n').map((t) => t.trim()).filter(Boolean) ?? DEFAULT_TERMS;
  const fillerRows = Math.max(0, MIN_ROWS - invoice.items.length);
  const hasDiscount = invoice.billDiscountPercent > 0;

  return (
    <div className="bill-sheet mx-auto flex min-h-[277mm] w-[190mm] flex-col border-2 border-black bg-white font-bill text-[12pt] leading-snug text-black">
      {/* Header: the shop's own header artwork (GSTIN, mobiles, name, address) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bill-header.png" alt={settings.shopName} className="block w-full border-b border-black" />

      <div className="grid grid-cols-2 border-b border-black py-[2mm] text-[13pt]">
        <p className="text-center">
          क्रमांक :- <span className="font-semibold">{invoice.invoiceNumber}</span>
        </p>
        <p className="text-center">
          दिनांक :- <span className="font-semibold">{formatBillDate(invoice.invoiceDate)}</span>
        </p>
      </div>

      <div className="border-b border-black px-[3mm] py-[3mm] text-[14pt]">
        {invoice.customerName}
        {invoice.customerMobile && <span className="ml-3 text-[11pt]">Mo. {invoice.customerMobile}</span>}
        {invoice.customerGstin && <span className="ml-3 text-[11pt]">GSTIN: {invoice.customerGstin}</span>}
        {invoice.customerAddress && <p className="text-[10pt]">{invoice.customerAddress}</p>}
      </div>

      {/* Item table */}
      <div className={`${GRID} border-b border-black bg-[#d9d9d9] text-center text-[13pt]`}>
        <div className={CELL}>विवरण</div>
        <div className={CELL}>नग</div>
        <div className={CELL}>मीटर/Ft.</div>
        <div className={`${CELL} text-right`}>दर</div>
        <div className={`${CELL} text-right`}>रकम</div>
      </div>
      {invoice.items.map((it) => (
        <div key={it.id} className={`${GRID} py-[0.6mm]`}>
          <div className={CELL}>{it.productName}</div>
          <div className={`${CELL} text-center`}>{it.pieces || ''}</div>
          <div className={`${CELL} text-center`}>{formatQty(it.quantity)}</div>
          <div className={`${CELL} text-right`}>{rateText(it.rate)}</div>
          <div className={`${CELL} text-right`}>{money2(it.lineTotal)}</div>
        </div>
      ))}
      {Array.from({ length: fillerRows }, (_, i) => (
        <div key={`f${i}`} className={`${GRID} h-[7mm]`}>
          {Array.from({ length: 5 }, (_, c) => (
            <div key={c} className={CELL} />
          ))}
        </div>
      ))}
      {/* Stretch the column lines down to the totals */}
      <div className={`${GRID} flex-1`}>
        {Array.from({ length: 5 }, (_, c) => (
          <div key={c} className={CELL} />
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-[minmax(0,1fr)_32mm] border-t border-black">
        <div className="flex items-center justify-center border-r border-black py-[2mm] text-[22pt] font-bold">
          {hasDiscount ? `${percentText(invoice.billDiscountPercent)}% Less` : ''}
        </div>
        <div className="text-right">
          <p className="border-b border-black px-[2mm] py-[1.5mm]">{money2(invoice.subtotal)}</p>
          <p className="px-[2mm] py-[1.5mm]">{hasDiscount ? money2(invoice.discountTotal) : ''}</p>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_32mm] border-y border-black bg-[#efefef] text-[13pt] font-bold">
        <p className="border-r border-black px-[3mm] py-[2mm] text-right">Total Net Pay</p>
        <p className="bg-[#d9d9d9] px-[2mm] py-[2mm] text-right">{money2(invoice.grandTotal)}</p>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between px-[3mm] pb-[4mm] pt-[5mm] text-[10.5pt]">
        <ul className="space-y-[1.5mm]">
          {terms.map((t) => (
            <li key={t}>• {t}</li>
          ))}
          {settings.invoiceFooter && <li>{settings.invoiceFooter}</li>}
        </ul>
        <p className="pr-[6mm]">हस्ताक्षर</p>
      </div>
    </div>
  );
}
