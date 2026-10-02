import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { idParam } from '../../utils/params';

/** Categories are a small lookup list, so routes and logic live together here. */

const categoryBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .transform((v) => (v === '' ? null : v))
    .nullish(),
});

async function list(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.json(categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })));
}

async function create(req: Request, res: Response) {
  res.status(201).json(await prisma.category.create({ data: req.body }));
}

async function update(req: Request, res: Response) {
  const id = idParam(req);
  if (!(await prisma.category.count({ where: { id } }))) throw AppError.notFound('Category not found');
  res.json(await prisma.category.update({ where: { id }, data: req.body }));
}

/** Products in a deleted category become "Uncategorised" (onDelete: SetNull). */
async function remove(req: Request, res: Response) {
  const id = idParam(req);
  if (!(await prisma.category.count({ where: { id } }))) throw AppError.notFound('Category not found');
  await prisma.category.delete({ where: { id } });
  res.status(204).end();
}

export const categoryRouter = Router();
categoryRouter.use(requireAuth);
categoryRouter.get('/', list);
categoryRouter.post('/', validateBody(categoryBody), create);
categoryRouter.put('/:id', validateBody(categoryBody), update);
categoryRouter.delete('/:id', remove);
