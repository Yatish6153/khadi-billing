import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { stateCodeFor } from '../../constants/indian-states';
import { AppError } from '../../utils/AppError';
import { toNumber } from '../../utils/decimal';
import { paginated, toSkipTake, type Pagination } from '../../utils/pagination';
import type { CustomerBody, CustomerListQuery } from './customer.schema';

/** Bills that count towards a customer's purchases (not cancelled / deleted). */
const COUNTED_INVOICE: Prisma.InvoiceWhereInput = { deletedAt: null, status: { not: 'CANCELLED' } };

function searchFilter(search?: string): Prisma.CustomerWhereInput {
  if (!search) return {};
  const contains = { contains: search, mode: 'insensitive' as const };
  return {
    OR: [{ name: contains }, { mobile: contains }, { gstNumber: contains }, { city: contains }],
  };
}

/** Purchase totals for a set of customers, keyed by customer id. */
async function purchaseStats(customerIds: number[]) {
  if (customerIds.length === 0) return new Map<number, { bills: number; total: number; lastPurchase: Date | null }>();

  const rows = await prisma.invoice.groupBy({
    by: ['customerId'],
    where: { ...COUNTED_INVOICE, customerId: { in: customerIds } },
    _count: { _all: true },
    _sum: { grandTotal: true },
    _max: { invoiceDate: true },
  });

  return new Map(
    rows.map((r) => [
      r.customerId!,
      { bills: r._count._all, total: toNumber(r._sum.grandTotal), lastPurchase: r._max.invoiceDate },
    ]),
  );
}

export async function listCustomers(query: CustomerListQuery) {
  const where = searchFilter(query.search);
  const orderBy: Prisma.CustomerOrderByWithRelationInput[] =
    query.sort === 'recent' ? [{ createdAt: 'desc' }] : [{ name: 'asc' }, { id: 'asc' }];

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy, ...toSkipTake(query) }),
    prisma.customer.count({ where }),
  ]);

  const stats = await purchaseStats(customers.map((c) => c.id));
  const items = customers.map((c) => ({
    ...c,
    stats: stats.get(c.id) ?? { bills: 0, total: 0, lastPurchase: null },
  }));

  return paginated(items, total, query);
}

export async function getCustomer(id: number) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw AppError.notFound('Customer not found');

  const stats = (await purchaseStats([id])).get(id) ?? { bills: 0, total: 0, lastPurchase: null };
  return { ...customer, stats };
}

/** The customer's bills, newest first. */
export async function getCustomerInvoices(id: number, pagination: Pagination) {
  const exists = await prisma.customer.count({ where: { id } });
  if (!exists) throw AppError.notFound('Customer not found');

  const where: Prisma.InvoiceWhereInput = { customerId: id, deletedAt: null };
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
      ...toSkipTake(pagination),
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        grandTotal: true,
        status: true,
        paymentMode: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const items = invoices.map(({ _count, ...inv }) => ({
    ...inv,
    grandTotal: toNumber(inv.grandTotal),
    itemCount: _count.items,
  }));
  return paginated(items, total, pagination);
}

/** Two customers can't share a mobile number, so bills are never attached to the wrong person. */
async function assertMobileAvailable(mobile: string | null | undefined, exceptId?: number) {
  if (!mobile) return;
  const clash = await prisma.customer.findFirst({
    where: { mobile, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { name: true },
  });
  if (clash) {
    throw AppError.conflict(`Mobile number already saved for ${clash.name}`);
  }
}

function toData(body: CustomerBody) {
  return { ...body, stateCode: body.state === undefined ? undefined : (stateCodeFor(body.state) ?? null) };
}

export async function createCustomer(body: CustomerBody) {
  await assertMobileAvailable(body.mobile);
  return prisma.customer.create({ data: toData(body) });
}

/**
 * Updating a customer never changes bills already issued: each invoice keeps
 * its own copy of the customer's details from the day it was made.
 */
export async function updateCustomer(id: number, body: CustomerBody) {
  const exists = await prisma.customer.count({ where: { id } });
  if (!exists) throw AppError.notFound('Customer not found');
  await assertMobileAvailable(body.mobile, id);
  return prisma.customer.update({ where: { id }, data: toData(body) });
}

/** Their bills are kept (with the customer's details copied on them) but unlinked. */
export async function deleteCustomer(id: number) {
  const exists = await prisma.customer.count({ where: { id } });
  if (!exists) throw AppError.notFound('Customer not found');
  await prisma.customer.delete({ where: { id } });
}
