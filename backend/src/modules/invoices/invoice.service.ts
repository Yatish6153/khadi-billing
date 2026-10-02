import { Prisma, type Unit } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { toNumber } from '../../utils/decimal';
import { DAY_MS, istDateKey, istStartOfKey } from '../../utils/dates';
import { paginated, toSkipTake } from '../../utils/pagination';
import { calculateInvoice } from './invoice.calc';
import type { InvoiceBody, InvoiceListQuery } from './invoice.schema';

type Tx = Prisma.TransactionClient;

const TX_OPTIONS = { timeout: 20_000 };

/** Today's bills keep the current time; back-dated bills are stamped at noon IST. */
function billInstant(dateKey: string): Date {
  if (dateKey === istDateKey(new Date())) return new Date();
  return new Date(istStartOfKey(dateKey).getTime() + 12 * 60 * 60 * 1000);
}

async function loadSettings(tx: Tx) {
  return tx.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** Customer snapshot printed on the bill, plus whether IGST applies. */
async function resolveCustomer(tx: Tx, body: InvoiceBody, shopStateCode: string | null) {
  if (body.customerId) {
    const c = await tx.customer.findUnique({ where: { id: body.customerId } });
    if (!c) throw AppError.badRequest('Selected customer no longer exists', { customerName: ['Customer not found'] });
    return {
      customerId: c.id,
      customerName: c.name,
      customerMobile: body.customerMobile ?? c.mobile,
      customerGstin: c.gstNumber,
      customerAddress: [c.address, c.city, c.pincode].filter(Boolean).join(', ') || null,
      customerState: c.state,
      customerStateCode: c.stateCode,
      placeOfSupply: c.state,
      isInterState: !!(c.stateCode && shopStateCode && c.stateCode !== shopStateCode),
    };
  }
  return {
    customerId: null,
    customerName: body.customerName || 'Cash',
    customerMobile: body.customerMobile ?? null,
    customerGstin: null,
    customerAddress: null,
    customerState: null,
    customerStateCode: null,
    placeOfSupply: null,
    isInterState: false,
  };
}

/** Builds the invoice row + item rows from the request, with totals worked out on the server. */
async function buildInvoiceData(tx: Tx, body: InvoiceBody) {
  const settings = await loadSettings(tx);
  const customer = await resolveCustomer(tx, body, settings.stateCode);

  const productIds = [...new Set(body.items.map((i) => i.productId).filter((id): id is number => !!id))];
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true, hsnCode: true, unit: true, gstRate: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = productIds.find((id) => !byId.has(id));
  if (missing) throw AppError.badRequest('A selected product no longer exists. Please pick it again.');

  const defaultGst = toNumber(settings.defaultGstRate);
  const lines = body.items.map((item) => {
    const product = item.productId ? byId.get(item.productId) : undefined;
    return { item, product, gstRate: product ? toNumber(product.gstRate) : defaultGst };
  });

  const calc = calculateInvoice({
    lines: lines.map((l) => ({ quantity: l.item.quantity, rate: l.item.rate, gstRate: l.gstRate })),
    discountPercent: body.discountPercent,
    interState: customer.isInterState,
  });

  const items = lines.map((l, i) => ({
    productId: l.product?.id ?? null,
    productName: l.item.description,
    sku: l.product?.sku ?? null,
    hsnCode: l.product?.hsnCode ?? null,
    unit: (l.product?.unit ?? 'MTR') as Unit,
    pieces: l.item.pieces,
    quantity: l.item.quantity,
    rate: l.item.rate,
    gstRate: l.gstRate,
    ...calc.items[i]!,
  }));

  const { items: _calcItems, ...totals } = calc;
  return { settings, customer, totals, items };
}

/** Next free bill number from Settings (skips numbers already used). */
async function allocateNumber(tx: Tx, requested: string | null | undefined, currentId?: number): Promise<string> {
  const settings = await loadSettings(tx);

  if (requested) {
    const clash = await tx.invoice.findFirst({
      where: { invoiceNumber: requested, ...(currentId ? { id: { not: currentId } } : {}) },
      select: { id: true },
    });
    if (clash) throw AppError.conflict(`Bill number ${requested} is already used`);
    // Typing a higher number moves the counter on, so the next bill follows it
    const numeric = Number(requested.slice(settings.invoicePrefix.length));
    if (Number.isInteger(numeric) && numeric >= settings.nextInvoiceNumber) {
      await tx.setting.update({ where: { id: 1 }, data: { nextInvoiceNumber: numeric + 1 } });
    }
    return requested;
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    const updated = await tx.setting.update({ where: { id: 1 }, data: { nextInvoiceNumber: { increment: 1 } } });
    const candidate = `${updated.invoicePrefix}${updated.nextInvoiceNumber - 1}`;
    const taken = await tx.invoice.findFirst({ where: { invoiceNumber: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw AppError.conflict('Could not find a free bill number. Set the next number in Settings.');
}

interface StockLine {
  productId: number | null;
  productName: string;
  quantity: Prisma.Decimal.Value;
}

/**
 * Sale → reduce stock; reversal (bill edited/deleted) → put it back.
 * Every change is written to the stock ledger. Selling more than is in stock
 * is allowed (the counter must not be blocked) but reported as a warning.
 */
async function moveStock(
  tx: Tx,
  lines: StockLine[],
  invoice: { id: number; invoiceNumber: string },
  direction: 'sale' | 'reversal',
  note?: string,
): Promise<string[]> {
  const warnings: string[] = [];

  // Only products with stock tracking switched on are counted
  const ids = [...new Set(lines.map((l) => l.productId).filter((id): id is number => !!id))];
  const tracked = new Set(
    ids.length
      ? (await tx.product.findMany({ where: { id: { in: ids }, trackStock: true }, select: { id: true } })).map((p) => p.id)
      : [],
  );

  const totals = new Map<number, { name: string; qty: Prisma.Decimal }>();
  for (const l of lines) {
    if (!l.productId || !tracked.has(l.productId)) continue;
    const prev = totals.get(l.productId);
    totals.set(l.productId, { name: l.productName, qty: (prev?.qty ?? new Prisma.Decimal(0)).plus(l.quantity) });
  }

  for (const [productId, { name, qty }] of totals) {
    const delta = direction === 'sale' ? qty.neg() : qty;
    const updated = await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: { increment: delta } },
      select: { stockQuantity: true, unit: true },
    });
    await tx.stockMovement.create({
      data: {
        productId,
        type: direction === 'sale' ? 'SALE' : 'SALE_REVERSAL',
        quantity: delta,
        balanceAfter: updated.stockQuantity,
        invoiceId: invoice.id,
        reference: `Bill ${invoice.invoiceNumber}`,
        note: note ?? null,
      },
    });
    if (direction === 'sale' && updated.stockQuantity.isNegative()) {
      warnings.push(`${name}: stock is now ${updated.stockQuantity.toString()} ${updated.unit}`);
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------

export async function createInvoice(body: InvoiceBody, userId: number) {
  return prisma.$transaction(async (tx) => {
    const { customer, totals, items } = await buildInvoiceData(tx, body);
    const invoiceNumber = await allocateNumber(tx, body.invoiceNumber);

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate: billInstant(body.invoiceDate),
        ...customer,
        ...totals,
        paymentMode: body.paymentMode,
        status: body.status,
        notes: body.notes ?? null,
        createdById: userId,
        items: { create: items },
      },
      select: { id: true, invoiceNumber: true },
    });

    const warnings = await moveStock(tx, items, invoice, 'sale');
    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber, warnings };
  }, TX_OPTIONS);
}

export async function updateInvoice(id: number, body: InvoiceBody) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { items: { select: { productId: true, productName: true, quantity: true } } },
    });
    if (!existing) throw AppError.notFound('Bill not found');

    // Put back the stock of the old lines, then sell the new ones
    await moveStock(tx, existing.items, existing, 'reversal', 'Bill edited');

    const { customer, totals, items } = await buildInvoiceData(tx, body);
    const invoiceNumber =
      body.invoiceNumber && body.invoiceNumber !== existing.invoiceNumber
        ? await allocateNumber(tx, body.invoiceNumber, id)
        : existing.invoiceNumber;

    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    const invoice = await tx.invoice.update({
      where: { id },
      data: {
        invoiceNumber,
        // Keep the original time when the date wasn't changed
        invoiceDate:
          istDateKey(existing.invoiceDate) === body.invoiceDate ? existing.invoiceDate : billInstant(body.invoiceDate),
        ...customer,
        ...totals,
        paymentMode: body.paymentMode,
        status: body.status,
        notes: body.notes ?? null,
        items: { create: items },
      },
      select: { id: true, invoiceNumber: true },
    });

    const warnings = await moveStock(tx, items, invoice, 'sale');
    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber, warnings };
  }, TX_OPTIONS);
}

/** Bills are never erased: they are marked deleted (hidden everywhere) and their stock is returned. */
export async function deleteInvoice(id: number) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { items: { select: { productId: true, productName: true, quantity: true } } },
    });
    if (!existing) throw AppError.notFound('Bill not found');
    await moveStock(tx, existing.items, existing, 'reversal', 'Bill deleted');
    await tx.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  }, TX_OPTIONS);
}

// ---------------------------------------------------------------------------

const decimalFields = [
  'subtotal', 'billDiscountPercent', 'discountTotal', 'taxableAmount',
  'cgstTotal', 'sgstTotal', 'igstTotal', 'roundOff', 'grandTotal',
] as const;
const itemDecimalFields = [
  'quantity', 'rate', 'discountPercent', 'discountAmount', 'taxableValue',
  'gstRate', 'cgstAmount', 'sgstAmount', 'igstAmount', 'lineTotal',
] as const;

function numbersOnly<T extends Record<string, unknown>>(row: T, fields: readonly string[]): T {
  const out: Record<string, unknown> = { ...row };
  for (const f of fields) out[f] = toNumber(row[f] as Prisma.Decimal);
  return out as T;
}

export async function getInvoice(id: number) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: { items: { orderBy: { id: 'asc' } } },
  });
  if (!invoice) throw AppError.notFound('Bill not found');
  return {
    ...numbersOnly(invoice, decimalFields),
    items: invoice.items.map((it) => numbersOnly(it, itemDecimalFields)),
  };
}

export async function listInvoices(q: InvoiceListQuery) {
  const and: Prisma.InvoiceWhereInput[] = [{ deletedAt: null }];
  if (q.search) {
    const contains = { contains: q.search, mode: 'insensitive' as const };
    and.push({ OR: [{ invoiceNumber: contains }, { customerName: contains }, { customerMobile: contains }] });
  }
  if (q.from) and.push({ invoiceDate: { gte: istStartOfKey(q.from) } });
  if (q.to) and.push({ invoiceDate: { lt: new Date(istStartOfKey(q.to).getTime() + DAY_MS) } });
  if (q.customerId) and.push({ customerId: q.customerId });
  if (q.paymentMode) and.push({ paymentMode: q.paymentMode });
  const where: Prisma.InvoiceWhereInput = { AND: and };

  const [rows, total, sums] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
      ...toSkipTake(q),
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        customerMobile: true,
        subtotal: true,
        discountTotal: true,
        grandTotal: true,
        paymentMode: true,
        status: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({ where: { AND: [...and, { status: { not: 'CANCELLED' } }] }, _sum: { grandTotal: true } }),
  ]);

  const items = rows.map(({ _count, ...r }) => ({
    ...numbersOnly(r, ['subtotal', 'discountTotal', 'grandTotal']),
    itemCount: _count.items,
  }));
  return { ...paginated(items, total, q), totalAmount: toNumber(sums._sum.grandTotal) };
}

/**
 * Item list for a bill row: products (with price and stock) and item names
 * typed on earlier bills (with the last rate used, most-used first).
 * With an empty query it returns the full pick list, so the user can choose
 * an item without typing.
 */
export async function lookupItems(q: string) {
  const contains = { contains: q, mode: 'insensitive' as const };
  const productWhere: Prisma.ProductWhereInput = q
    ? { isActive: true, OR: [{ name: contains }, { sku: { equals: q, mode: 'insensitive' } }, { barcode: q }] }
    : { isActive: true };

  const [products, history] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: { name: 'asc' },
      take: q ? 8 : 100,
      select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, stockQuantity: true, trackStock: true },
    }),
    prisma.$queryRaw<{ name: string; rate: Prisma.Decimal }[]>`
      SELECT name, rate FROM (
        SELECT DISTINCT ON (lower(ii."productName")) ii."productName" AS name, ii.rate,
               COUNT(*) OVER (PARTITION BY lower(ii."productName")) AS uses
        FROM invoice_items ii
        JOIN invoices i ON i.id = ii."invoiceId"
        WHERE i."deletedAt" IS NULL AND ii."productId" IS NULL AND ii."productName" ILIKE ${`%${q}%`}
        ORDER BY lower(ii."productName"), i."invoiceDate" DESC
      ) t
      ORDER BY uses DESC, name
      LIMIT ${q ? 8 : 30}`,
  ]);

  return {
    products: products.map((p) => ({ ...p, sellingPrice: toNumber(p.sellingPrice), stockQuantity: toNumber(p.stockQuantity) })),
    history: history.map((h) => ({ name: h.name, rate: toNumber(h.rate) })),
  };
}
