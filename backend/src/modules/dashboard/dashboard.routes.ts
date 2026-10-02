import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as controller from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/summary', controller.summary);
