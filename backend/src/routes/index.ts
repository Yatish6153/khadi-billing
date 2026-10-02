import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { customerRouter } from '../modules/customers/customer.routes';
import { categoryRouter } from '../modules/categories/category.routes';
import { productRouter } from '../modules/products/product.routes';
import { invoiceRouter } from '../modules/invoices/invoice.routes';
import { settingsRouter } from '../modules/settings/settings.routes';
import { prisma } from '../lib/prisma';

/**
 * Root API router, mounted at /api. Each feature module owns its own router;
 * later phases register customers, products, invoices, reports, etc. here.
 */
export const apiRouter = Router();

/** Health check for Railway / uptime monitors. Also verifies the DB connection. */
apiRouter.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', time: new Date().toISOString() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/invoices', invoiceRouter);
apiRouter.use('/settings', settingsRouter);
