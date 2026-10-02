import type { Request, Response } from 'express';
import * as productService from './product.service';
import { productListQuery, type CreateProductBody, type StockAdjustmentBody, type UpdateProductBody } from './product.schema';
import { paginationQuery } from '../../utils/pagination';
import { idParam } from '../../utils/params';
import { AppError } from '../../utils/AppError';
import { uploadUrl } from '../../lib/uploads';

export async function list(req: Request, res: Response) {
  res.json(await productService.listProducts(productListQuery.parse(req.query)));
}

export async function stockSummary(_req: Request, res: Response) {
  res.json(await productService.getStockSummary());
}

export async function get(req: Request, res: Response) {
  res.json(await productService.getProduct(idParam(req)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await productService.createProduct(req.body as CreateProductBody));
}

export async function update(req: Request, res: Response) {
  res.json(await productService.updateProduct(idParam(req), req.body as UpdateProductBody));
}

export async function remove(req: Request, res: Response) {
  res.json(await productService.deleteProduct(idParam(req)));
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) throw AppError.badRequest('Choose an image to upload');
  res.json(await productService.setImage(idParam(req), uploadUrl('products', req.file.filename)));
}

export async function removeImage(req: Request, res: Response) {
  res.json(await productService.setImage(idParam(req), null));
}

export async function adjustStock(req: Request, res: Response) {
  res.json(await productService.adjustStock(idParam(req), req.body as StockAdjustmentBody));
}

export async function stockMovements(req: Request, res: Response) {
  res.json(await productService.getStockMovements(idParam(req), paginationQuery.parse(req.query)));
}
