import type { Request, Response } from 'express';
import { z } from 'zod';
import * as dashboardService from './dashboard.service';

const summaryQuery = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((d) => [7, 30, 90].includes(d), 'days must be 7, 30 or 90')
    .default(30),
});

export async function summary(req: Request, res: Response) {
  const { days } = summaryQuery.parse(req.query);
  res.json(await dashboardService.getSummary(days));
}
