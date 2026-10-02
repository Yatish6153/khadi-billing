import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { imageUpload } from '../../lib/uploads';
import { createProductSchema, stockAdjustmentSchema, updateProductSchema } from './product.schema';
import * as controller from './product.controller';

export const productRouter = Router();

productRouter.use(requireAuth);

productRouter.get('/', controller.list);
productRouter.get('/stock-summary', controller.stockSummary);
productRouter.post('/', validateBody(createProductSchema), controller.create);
productRouter.get('/:id', controller.get);
productRouter.put('/:id', validateBody(updateProductSchema), controller.update);
productRouter.delete('/:id', controller.remove);

productRouter.post('/:id/image', imageUpload('products'), controller.uploadImage);
productRouter.delete('/:id/image', controller.removeImage);

productRouter.post('/:id/stock', validateBody(stockAdjustmentSchema), controller.adjustStock);
productRouter.get('/:id/stock-movements', controller.stockMovements);
