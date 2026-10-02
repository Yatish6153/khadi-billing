import { Prisma, type Category, type Product } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { removeUpload } from '../../lib/uploads';
import { AppError } from '../../utils/AppError';
import { toNumber } from '../../utils/decimal';
import { paginated, toSkipTake, type Pagination } from '../../utils/pagination';
import type { CreateProductBody, ProductListQuery, StockAdjustmentBody, UpdateProductBody } from './product.schema';

type ProductWithCategory = Product & { category: Pick<Category, 'id' | 'name'> | null };

/** Decimal columns → plain numbers for the JSON response. */
function toDTO(p: ProductWithCategory) {
  return {
    ...p,
    gstRate: toNumber(p.gstRate),
    purchasePrice: toNumber(p.purchasePrice),
    sellingPrice: toNumber(p.sellingPrice),
    stockQuantity: toNumber(p.stockQuantity),
    lowStockThreshold: toNumber(p.lowStockThreshold),
  };
}

const withCategory = { category: { select: { id: true, name: true } } } as const;

function buildWhere(q: ProductListQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  if (q.status === 'active') and.push({ isActive: true });
  if (q.status === 'inactive') and.push({ isActive: false });

  if (q.search) {
    const contains = { contains: q.search, mode: 'insensitive' as const };
    and.push({ OR: [{ name: contains }, { sku: contains }, { barcode: contains }, { hsnCode: { startsWith: q.search } }] });
  }

  if (q.categoryId === 'none') and.push({ categoryId: null });
  else if (q.categoryId) and.push({ categoryId: q.categoryId });

  if (q.tracked === 'true') and.push({ trackStock: true });
  if (q.stock === 'out') and.push({ trackStock: true }, { stockQuantity: { lte: 0 } });
  if (q.stock === 'low') {
    and.push(
      { trackStock: true },
      { stockQuantity: { gt: 0 } },
      { stockQuantity: { lte: prisma.product.fields.lowStockThreshold } },
    );
  }

  return { AND: and };
}

const SORTS: Record<ProductListQuery['sort'], Prisma.ProductOrderByWithRelationInput[]> = {
  name: [{ name: 'asc' }, { id: 'asc' }],
  stock: [{ stockQuantity: 'asc' }, { name: 'asc' }],
  price: [{ sellingPrice: 'desc' }, { name: 'asc' }],
  recent: [{ createdAt: 'desc' }],
};

export async function listProducts(q: ProductListQuery) {
  const where = buildWhere(q);
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: SORTS[q.sort], include: withCategory, ...toSkipTake(q) }),
    prisma.product.count({ where }),
  ]);
  return paginated(products.map(toDTO), total, q);
}

export async function getProduct(id: number) {
  const product = await prisma.product.findUnique({ where: { id }, include: withCategory });
  if (!product) throw AppError.notFound('Product not found');
  return toDTO(product);
}

/** Creates the product; a blank SKU becomes KH-0001 style, based on the new id. */
/** GST rate for a product: the one chosen, or the shop default from Settings. */
async function gstRateOrDefault(rate: number | undefined): Promise<number> {
  if (rate !== undefined) return rate;
  const settings = await prisma.setting.findUnique({ where: { id: 1 }, select: { defaultGstRate: true } });
  return toNumber(settings?.defaultGstRate ?? 5);
}

export async function createProduct(body: CreateProductBody) {
  const { sku, gstRate, openingStock: opening, ...fields } = body;
  // Opening stock only matters when stock is tracked
  const openingStock = body.trackStock ? opening : 0;
  const rate = await gstRateOrDefault(gstRate);

  const product = await prisma.$transaction(async (tx) => {
    let created = await tx.product.create({
      data: { ...fields, gstRate: rate, sku: sku ?? `TMP-${Date.now()}-${Math.random()}`, stockQuantity: openingStock },
    });
    if (!sku) {
      created = await tx.product.update({
        where: { id: created.id },
        data: { sku: `KH-${String(created.id).padStart(4, '0')}` },
      });
    }
    if (openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          type: 'OPENING',
          quantity: openingStock,
          balanceAfter: openingStock,
          note: 'Opening stock',
        },
      });
    }
    return created;
  });

  return getProduct(product.id);
}

export async function updateProduct(id: number, body: UpdateProductBody) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { sku: true, gstRate: true } });
  if (!existing) throw AppError.notFound('Product not found');

  // A cleared SKU keeps the old one (every product must have a SKU); no GST sent keeps the old rate
  await prisma.product.update({
    where: { id },
    data: { ...body, sku: body.sku ?? existing.sku, gstRate: body.gstRate ?? existing.gstRate },
  });
  return getProduct(id);
}

/**
 * Products that appear on bills are only deactivated (so old bills and
 * reports stay intact). Never-billed products are deleted completely.
 */
export async function deleteProduct(id: number): Promise<{ action: 'deleted' | 'deactivated' }> {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { imageUrl: true, _count: { select: { invoiceItems: true } } },
  });
  if (!product) throw AppError.notFound('Product not found');

  if (product._count.invoiceItems > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return { action: 'deactivated' };
  }

  await prisma.product.delete({ where: { id } });
  removeUpload(product.imageUrl);
  return { action: 'deleted' };
}

export async function setImage(id: number, imageUrl: string | null) {
  const product = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!product) {
    removeUpload(imageUrl);
    throw AppError.notFound('Product not found');
  }
  await prisma.product.update({ where: { id }, data: { imageUrl } });
  if (product.imageUrl !== imageUrl) removeUpload(product.imageUrl);
  return getProduct(id);
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

/**
 * Adds, removes or sets stock, and records the change in the stock ledger.
 * Runs in a transaction so the ledger balance always matches the product.
 */
export async function adjustStock(id: number, { mode, quantity, note }: StockAdjustmentBody) {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id }, select: { stockQuantity: true, trackStock: true } });
    if (!product) throw AppError.notFound('Product not found');
    if (!product.trackStock) {
      throw AppError.badRequest('Stock is not tracked for this item. Turn on “Track stock” in the product first.');
    }

    const current = product.stockQuantity;
    const qty = new Prisma.Decimal(quantity);
    const delta = mode === 'add' ? qty : mode === 'remove' ? qty.neg() : qty.minus(current);

    if (mode !== 'set' && qty.isZero()) throw AppError.badRequest('Enter a quantity', { quantity: ['Enter a quantity'] });
    if (delta.isZero()) throw AppError.badRequest('Stock is already at this level', { quantity: ['No change'] });

    const updated = await tx.product.update({
      where: { id },
      data: { stockQuantity: { increment: delta } },
      select: { stockQuantity: true },
    });
    if (updated.stockQuantity.isNegative()) {
      throw AppError.badRequest(`Only ${current.toString()} in stock`, {
        quantity: [`Can't remove more than the ${current.toString()} in stock`],
      });
    }

    await tx.stockMovement.create({
      data: {
        productId: id,
        type: mode === 'add' ? 'PURCHASE' : 'ADJUSTMENT',
        quantity: delta,
        balanceAfter: updated.stockQuantity,
        note: note ?? (mode === 'set' ? 'Stock count corrected' : null),
      },
    });
  });

  return getProduct(id);
}

export async function getStockMovements(id: number, pagination: Pagination) {
  if (!(await prisma.product.count({ where: { id } }))) throw AppError.notFound('Product not found');

  const where = { productId: id };
  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...toSkipTake(pagination) }),
    prisma.stockMovement.count({ where }),
  ]);

  const items = rows.map((m) => ({ ...m, quantity: toNumber(m.quantity), balanceAfter: toNumber(m.balanceAfter) }));
  return paginated(items, total, pagination);
}

interface StockSummaryRow {
  products: number;
  cost_value: Prisma.Decimal | null;
  selling_value: Prisma.Decimal | null;
  low: number;
  out: number;
}

/** Headline numbers for the Inventory page (active products only). */
export async function getStockSummary() {
  const [row] = await prisma.$queryRaw<StockSummaryRow[]>`
    SELECT COUNT(*)::int AS products,
           SUM(CASE WHEN "stockQuantity" > 0 THEN "stockQuantity" * "purchasePrice" END) AS cost_value,
           SUM(CASE WHEN "stockQuantity" > 0 THEN "stockQuantity" * "sellingPrice" END) AS selling_value,
           (COUNT(*) FILTER (WHERE "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold"))::int AS low,
           (COUNT(*) FILTER (WHERE "stockQuantity" <= 0))::int AS out
    FROM products
    WHERE "isActive" = true AND "trackStock" = true`;

  return {
    products: row?.products ?? 0,
    costValue: toNumber(row?.cost_value),
    sellingValue: toNumber(row?.selling_value),
    lowStock: row?.low ?? 0,
    outOfStock: row?.out ?? 0,
  };
}
