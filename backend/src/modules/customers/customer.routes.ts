import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { customerBodySchema } from './customer.schema';
import * as controller from './customer.controller';

export const customerRouter = Router();

customerRouter.use(requireAuth);

customerRouter.get('/', controller.list);
customerRouter.post('/', validateBody(customerBodySchema), controller.create);
customerRouter.get('/:id', controller.get);
customerRouter.get('/:id/invoices', controller.invoices);
customerRouter.put('/:id', validateBody(customerBodySchema), controller.update);
customerRouter.delete('/:id', controller.remove);
