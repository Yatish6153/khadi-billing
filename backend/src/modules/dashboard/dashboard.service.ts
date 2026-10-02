import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { toNumber } from '../../utils/decimal';
import { DAY_MS, istDateKey, istDayStart, istMonthStart } from '../../utils/dates';

/** Bills that count as sales: not cancelled and not deleted. */
const COUNTED_INVOICE: Prisma.InvoiceWhereInput = {
  deletedAt: null,
  status: { not: 'CANCELLED' },
};

const LOW_STOCK_PRODUCT: Prisma.ProductWhereInput = {
  isActive: true,
  trackStock: true,
  // Compare two columns of the same row: stock at or below its own threshold
  stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
};

interface TrendRow {
  day: string;
  total: Prisma.Decimal | null;
  bills: bigint;
}

/** Daily sales totals for the last `days` IST days, with empty days filled as 0. */
async function getSalesTrend(days: number, now: Date) {
  const from = istDayStart(new Date(now.getTime() - (days - 1) * DAY_MS));

  // Group by IST calendar day. invoiceDate is stored in UTC, so shift by +5:30 first.
  const rows = await prisma.$queryRaw<TrendRow[]>`
    SELECT to_char(("invoiceDate" + interval '330 minutes')::date, 'YYYY-MM-DD') AS day,
           SUM("grandTotal") AS total,
           COUNT(*) AS bills
    FROM invoices
    WHERE "deletedAt" IS NULL
      AND status <> 'CANCELLED'
      AND "invoiceDate" >= ${from}
    GROUP BY 1
    ORDER BY 1`;

  const byDay = new Map(rows.map((r) => [r.day, r]));

  return Array.from({ length: days }, (_, i) => {
    const date = istDateKey(new Date(from.getTime() + i * DAY_MS));
    const row = byDay.get(date);
    return { date, sales: toNumber(row?.total), bills: Number(row?.bills ?? 0) };
  });
}

export async function getSummary(trendDays: number) {
  const now = new Date();
  const todayStart = istDayStart(now);
  const monthStart = istMonthStart(now);

  const [today, month, totalCustomers, totalProducts, lowStockCount, lowStockItems, recentInvoices, salesTrend] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: { ...COUNTED_INVOICE, invoiceDate: { gte: todayStart } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: { ...COUNTED_INVOICE, invoiceDate: { gte: monthStart } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.customer.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: LOW_STOCK_PRODUCT }),
      prisma.product.findMany({
        where: LOW_STOCK_PRODUCT,
        orderBy: { stockQuantity: 'asc' },
        take: 6,
        select: { id: true, name: true, sku: true, unit: true, stockQuantity: true, lowStockThreshold: true },
      }),
      prisma.invoice.findMany({
        where: { deletedAt: null },
        orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
        take: 8,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          customerName: true,
          grandTotal: true,
          status: true,
          paymentMode: true,
        },
      }),
      getSalesTrend(trendDays, now),
    ]);

  return {
    today: { sales: toNumber(today._sum.grandTotal), bills: today._count },
    month: { sales: toNumber(month._sum.grandTotal), bills: month._count },
    totalCustomers,
    totalProducts,
    lowStock: {
      count: lowStockCount,
      items: lowStockItems.map((p) => ({
        ...p,
        stockQuantity: toNumber(p.stockQuantity),
        lowStockThreshold: toNumber(p.lowStockThreshold),
      })),
    },
    recentInvoices: recentInvoices.map((inv) => ({ ...inv, grandTotal: toNumber(inv.grandTotal) })),
    salesTrend,
  };
}
