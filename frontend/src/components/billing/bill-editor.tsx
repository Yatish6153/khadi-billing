'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Printer, Save, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { billTotals, dateKeyOf, money2, round2, todayKey } from '@/lib/bill';
import { formatINR, formatQty } from '@/lib/format';
import { PAYMENT_MODE } from '@/lib/invoice-labels';
import { cn } from '@/lib/utils';
import type { Customer, Paginated } from '@/types/customer';
import type { PaymentMode } from '@/types/dashboard';
import type { Invoice, ItemLookup, SaveInvoiceResult, ShopSettings } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { SuggestInput, type Suggestion } from '@/components/ui/suggest-input';

interface Row {
  key: string;
  productId: number | null;
  description: string;
  /** नग */
  pieces: string;
  /** मीटर/Ft. */
  quantity: string;
  /** दर */
  rate: string;
  /** Shown under the item when it's a stocked product */
  stock?: { qty: number; unit: string };
}

const COLS = 4; // description, pieces, quantity, rate
const MIN_ROWS = 4;

let rowSeq = 0;
const newRow = (): Row => ({ key: `r${++rowSeq}`, productId: null, description: '', pieces: '', quantity: '', rate: '' });
const isBlank = (r: Row) => !r.description.trim() && !r.quantity && !r.rate && !r.pieces;
const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

/** Billed quantity: metres/feet when entered, otherwise the number of pieces (as in the Excel bill). */
function billedQty(r: Row): number {
  const q = num(r.quantity);
  if (!Number.isNaN(q)) return q;
  const p = num(r.pieces);
  return Number.isNaN(p) ? 0 : p;
}
const rowAmount = (r: Row) => {
  const rate = num(r.rate);
  return Number.isNaN(rate) ? 0 : round2(billedQty(r) * rate);
};

function padRows(rows: Row[]): Row[] {
  const out = [...rows];
  while (out.length < MIN_ROWS || !isBlank(out[out.length - 1]!)) out.push(newRow());
  return out;
}

interface BillEditorProps {
  settings: ShopSettings;
  /** Present when editing an existing bill */
  invoice?: Invoice;
}

/** The bill-making screen: same columns and maths as the shop's Excel bill. */
export function BillEditor({ settings, invoice }: BillEditorProps) {
  const router = useRouter();
  const isEdit = !!invoice;

  const [invoiceNumber, setInvoiceNumber] = React.useState(invoice?.invoiceNumber ?? '');
  const [date, setDate] = React.useState(invoice ? dateKeyOf(invoice.invoiceDate) : todayKey());
  const [customerId, setCustomerId] = React.useState<number | null>(invoice?.customerId ?? null);
  const [customerName, setCustomerName] = React.useState(invoice?.customerName ?? 'Cash');
  const [customerMobile, setCustomerMobile] = React.useState(invoice?.customerMobile ?? '');
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>(invoice?.paymentMode ?? 'CASH');
  const [discount, setDiscount] = React.useState(String(invoice?.billDiscountPercent ?? settings.defaultDiscountPercent));
  const [rows, setRows] = React.useState<Row[]>(() =>
    padRows(
      invoice?.items.map((it) => ({
        key: `r${++rowSeq}`,
        productId: it.productId,
        description: it.productName,
        pieces: String(it.pieces),
        quantity: formatQty(it.quantity),
        rate: String(it.rate),
      })) ?? [],
    ),
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<false | 'save' | 'print'>(false);
  const [dirty, setDirty] = React.useState(false);

  const cells = React.useRef(new Map<string, HTMLInputElement | null>());
  const lookupCache = React.useRef(new Map<string, { productId: number | null; name: string; rate: number; stock?: Row['stock'] }>());
  const customerCache = React.useRef(new Map<string, Customer>());

  const amounts = rows.map(rowAmount);
  const discountPct = Math.min(Math.max(Number(discount) || 0, 0), 100);
  const totals = billTotals(amounts, discountPct);

  // Warn before closing the tab with an unsaved bill
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setDirty(true);
    setRows((prev) => padRows(prev.map((r, i) => (i === index ? { ...r, ...patch } : r))));
    setErrors((e) => {
      const { [`row-${index}`]: _, ...rest } = e;
      return rest;
    });
  };

  const removeRow = (index: number) => {
    setDirty(true);
    setRows((prev) => padRows(prev.filter((_, i) => i !== index)));
  };

  const focusCell = (row: number, col: number) => {
    // Wait one tick so a newly added row has rendered
    setTimeout(() => {
      const el = cells.current.get(`${row}-${col}`);
      el?.focus();
      el?.select();
    });
  };

  /** Enter moves to the next cell, like Excel; after दर it jumps to the next row. */
  const nextCell = (row: number, col: number) => (col < COLS - 1 ? focusCell(row, col + 1) : focusCell(row + 1, 0));

  const fetchItems = React.useCallback(async (q: string): Promise<Suggestion[]> => {
    const data = await api<ItemLookup>(`/invoices/lookup?q=${encodeURIComponent(q)}`);
    const out: Suggestion[] = [];
    for (const p of data.products) {
      const key = `p${p.id}`;
      // Stock is only shown for items that track it
      const stock = p.trackStock ? { qty: p.stockQuantity, unit: p.unit } : undefined;
      lookupCache.current.set(key, { productId: p.id, name: p.name, rate: p.sellingPrice, stock });
      out.push({
        key,
        label: p.name,
        hint: stock ? `₹${p.sellingPrice} · ${formatQty(stock.qty)} ${stock.unit} left` : `₹${p.sellingPrice}`,
        group: 'Products',
      });
    }
    for (const h of data.history) {
      const key = `h${h.name}`;
      lookupCache.current.set(key, { productId: null, name: h.name, rate: h.rate });
      out.push({ key, label: h.name, hint: `last ₹${h.rate}`, group: 'Used on earlier bills' });
    }
    return out;
  }, []);

  const fetchCustomers = React.useCallback(async (q: string): Promise<Suggestion[]> => {
    const data = await api<Paginated<Customer>>(`/customers?search=${encodeURIComponent(q)}&pageSize=6`);
    return data.items.map((c) => {
      customerCache.current.set(`c${c.id}`, c);
      return { key: `c${c.id}`, label: c.name, hint: c.mobile ?? c.city ?? undefined };
    });
  }, []);

  /** Checks the rows and builds the request; returns null (and shows errors) if something is missing. */
  const buildBody = () => {
    const errs: Record<string, string> = {};
    const items = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => !isBlank(r))
      .map(({ r, i }) => {
        const qty = billedQty(r);
        const rate = num(r.rate);
        if (!r.description.trim()) errs[`row-${i}`] = 'Enter the item name (विवरण)';
        else if (!(qty > 0)) errs[`row-${i}`] = 'Enter मीटर/Ft. or नग';
        else if (Number.isNaN(rate) || rate < 0) errs[`row-${i}`] = 'Enter the rate (दर)';
        return {
          productId: r.productId,
          description: r.description.trim(),
          pieces: Number.isNaN(num(r.pieces)) ? 1 : Math.round(num(r.pieces)),
          quantity: qty,
          rate: Number.isNaN(rate) ? 0 : rate,
        };
      });
    if (items.length === 0) errs.items = 'Add at least one item';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(errs.items ?? 'Please complete the highlighted rows');
      return null;
    }
    return {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: date,
      customerId,
      customerName: customerName.trim() || 'Cash',
      customerMobile: customerMobile.trim(),
      discountPercent: discountPct,
      paymentMode,
      status: paymentMode === 'CREDIT' ? 'UNPAID' : 'PAID',
      items,
    };
  };

  const save = async (andPrint: boolean) => {
    if (saving) return;
    const body = buildBody();
    if (!body) return;
    setSaving(andPrint ? 'print' : 'save');
    try {
      const res = await api<SaveInvoiceResult>(isEdit ? `/invoices/${invoice!.id}` : '/invoices', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      setDirty(false);
      toast.success(`Bill ${res.invoiceNumber} saved`);
      res.warnings.forEach((w) => toast.warning(w));
      router.push(`/invoices/${res.id}${andPrint ? '?print=1' : ''}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErrors((e) => ({ ...e, invoiceNumber: err.message }));
      toast.error(err instanceof ApiError ? err.message : 'Could not save the bill');
      setSaving(false);
    }
  };

  // Ctrl+Enter or Ctrl+S = Save & Print
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        void save(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const filledCount = rows.filter((r) => !isBlank(r)).length;

  return (
    <div className="space-y-4">
      {/* Bill details */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="bill-no">क्रमांक (Bill No.)</Label>
            <Input
              id="bill-no"
              value={invoiceNumber}
              onChange={(e) => {
                setDirty(true);
                setInvoiceNumber(e.target.value);
                setErrors(({ invoiceNumber: _, ...rest }) => rest);
              }}
              placeholder={isEdit ? '' : `${settings.invoicePrefix}${settings.nextInvoiceNumber} (auto)`}
              aria-invalid={!!errors.invoiceNumber}
            />
            {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bill-date">दिनांक (Date)</Label>
            <Input
              id="bill-date"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => {
                setDirty(true);
                setDate(e.target.value || todayKey());
              }}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bill-customer">Customer</Label>
            <SuggestInput
              id="bill-customer"
              value={customerName}
              onValueChange={(v) => {
                setDirty(true);
                setCustomerName(v);
                setCustomerId(null);
              }}
              onFocus={(e) => e.target.select()}
              fetchSuggestions={fetchCustomers}
              onPick={(s) => {
                const c = customerCache.current.get(s.key);
                if (!c) return;
                setCustomerId(c.id);
                setCustomerName(c.name);
                setCustomerMobile(c.mobile ?? '');
                focusCell(0, 0);
              }}
              onEnter={() => focusCell(0, 0)}
              placeholder="Cash"
            />
            {customerId && <p className="text-xs text-[hsl(var(--success))]">Saved customer — bill will appear in their history</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bill-mobile">Mobile</Label>
            <Input
              id="bill-mobile"
              type="tel"
              inputMode="numeric"
              value={customerMobile}
              onChange={(e) => {
                setDirty(true);
                setCustomerMobile(e.target.value);
              }}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bill-payment">Payment</Label>
            <NativeSelect
              id="bill-payment"
              value={paymentMode}
              onChange={(e) => {
                setDirty(true);
                setPaymentMode(e.target.value as PaymentMode);
              }}
            >
              {(Object.keys(PAYMENT_MODE) as PaymentMode[]).map((m) => (
                <option key={m} value={m}>
                  {m === 'CREDIT' ? 'Credit (उधार)' : PAYMENT_MODE[m]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="hidden grid-cols-[2rem_minmax(0,1fr)_4.5rem_6rem_6.5rem_7.5rem_2.5rem] gap-2 border-b px-1 pb-2 text-xs font-semibold text-muted-foreground md:grid">
            <span>#</span>
            <span>विवरण (Item)</span>
            <span className="text-center">नग</span>
            <span className="text-center">मीटर/Ft.</span>
            <span className="text-right">दर (Rate)</span>
            <span className="text-right">रकम</span>
            <span />
          </div>

          <ul className="divide-y">
            {rows.map((row, i) => {
              const amount = amounts[i]!;
              const error = errors[`row-${i}`];
              const blank = isBlank(row);
              return (
                <li key={row.key} className={cn('px-1 py-2', error && 'bg-destructive/5')}>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2 md:grid-cols-[2rem_minmax(0,1fr)_4.5rem_6rem_6.5rem_7.5rem_2.5rem] md:items-center">
                    <span className="hidden text-sm text-muted-foreground md:block">{i + 1}</span>
                    <div className="col-span-3 md:col-span-1">
                      <SuggestInput
                        ref={(el) => {
                          cells.current.set(`${i}-0`, el);
                        }}
                        value={row.description}
                        onValueChange={(v) => updateRow(i, { description: v, productId: null, stock: undefined })}
                        fetchSuggestions={fetchItems}
                        openOnFocus
                        onPick={(s) => {
                          const hit = lookupCache.current.get(s.key);
                          if (!hit) return;
                          updateRow(i, {
                            description: hit.name,
                            productId: hit.productId,
                            rate: String(hit.rate),
                            stock: hit.stock,
                            pieces: row.pieces || '1',
                          });
                          focusCell(i, 1);
                        }}
                        onEnter={() => nextCell(i, 0)}
                        placeholder={i === 0 ? 'Click to choose, or type an item' : ''}
                        aria-label={`Item ${i + 1}`}
                        aria-invalid={!!error}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className={cn(
                        'flex h-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive md:order-last',
                        blank && 'invisible',
                      )}
                      aria-label={`Remove item ${i + 1}`}
                      tabIndex={-1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {(
                      [
                        ['pieces', 'नग', 1, 'numeric'],
                        ['quantity', 'मीटर/Ft.', 2, 'decimal'],
                        ['rate', 'दर', 3, 'decimal'],
                      ] as const
                    ).map(([field, label, col, mode]) => (
                      <Input
                        key={field}
                        ref={(el) => {
                          cells.current.set(`${i}-${col}`, el);
                        }}
                        value={row[field]}
                        onChange={(e) => updateRow(i, { [field]: e.target.value.replace(/[^0-9.]/g, '') })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nextCell(i, col);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        inputMode={mode}
                        placeholder={field === 'pieces' && !blank ? '1' : label}
                        aria-label={`${label} for item ${i + 1}`}
                        className={cn('tabular-nums md:placeholder:text-transparent', field === 'rate' ? 'text-right' : 'text-center')}
                      />
                    ))}
                    <p className="col-span-3 self-center text-right font-semibold tabular-nums md:col-span-1">
                      {amount ? money2(amount) : <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>
                  {(error || row.stock) && (
                    <p className={cn('mt-1 text-xs md:ml-10', error ? 'text-destructive' : 'text-muted-foreground')}>
                      {error ??
                        (row.stock &&
                          `In stock: ${formatQty(row.stock.qty)} ${row.stock.unit}${
                            row.stock.qty < billedQty(row) ? ' — not enough, stock will go negative' : ''
                          }`)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              setRows((prev) => [...prev, newRow()]);
              focusCell(rows.length, 0);
            }}
          >
            <Plus /> Add row
          </Button>
          <p className="mt-1 px-1 text-xs text-muted-foreground">
            The item list shows your{' '}
            <Link href="/products" className="font-medium text-primary underline-offset-4 hover:underline">
              Products
            </Link>{' '}
            and items used on earlier bills. Add products once, then just click and choose.
          </p>
        </CardContent>
      </Card>

      {/* Totals + actions */}
      <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start lg:justify-between">
        <p className="text-xs text-muted-foreground lg:max-w-sm">
          Tip: press <kbd className="rounded border px-1">Enter</kbd> to move to the next box (like Excel) and{' '}
          <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">Enter</kbd> to save &amp;
          print. Items picked from <Link href="/products" className="underline">Products</Link> reduce stock
          automatically.
        </p>

        <Card className="w-full lg:w-96">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total ({filledCount} items)</span>
              <span className="font-medium tabular-nums">{money2(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor="bill-discount" className="flex items-center gap-2 text-muted-foreground">
                <Input
                  id="bill-discount"
                  value={discount}
                  onChange={(e) => {
                    setDirty(true);
                    setDiscount(e.target.value.replace(/[^0-9.]/g, ''));
                  }}
                  onFocus={(e) => e.target.select()}
                  inputMode="decimal"
                  className="h-8 w-16 text-right tabular-nums"
                />
                % Less
              </label>
              <span className="font-medium tabular-nums">− {money2(totals.discount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-accent px-3 py-2 text-accent-foreground">
              <span className="font-semibold">Total Net Pay</span>
              <span className="text-xl font-bold tabular-nums">{formatINR(totals.net)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" onClick={() => save(false)} loading={saving === 'save'} disabled={!!saving}>
                {saving !== 'save' && <Save />} Save
              </Button>
              <Button onClick={() => save(true)} loading={saving === 'print'} disabled={!!saving}>
                {saving !== 'print' && <Printer />} Save &amp; Print
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
