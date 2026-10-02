import { Router, type Request, type Response } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { toNumber } from '../../utils/decimal';

/** Returns the single settings row, creating it with defaults on first use. */
export async function getSettings() {
  const settings = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return {
    ...settings,
    defaultDiscountPercent: toNumber(settings.defaultDiscountPercent),
    defaultGstRate: toNumber(settings.defaultGstRate),
  };
}

async function get(_req: Request, res: Response) {
  res.json(await getSettings());
}

/** Read-only for now; editing arrives with the Settings module (Phase 7). */
export const settingsRouter = Router();
settingsRouter.use(requireAuth);
settingsRouter.get('/', get);
