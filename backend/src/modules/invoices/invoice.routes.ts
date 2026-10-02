import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { idParam } from '../../utils/params';
import * as invoiceService from './invoice.service';
import { invoiceBodySchema, invoiceListQuery, lookupQuery, type InvoiceBody } from './invoice.schema';

async function list(req: Request, res: Response) {
  res.json(await invoiceService.listInvoices(invoiceListQuery.parse(req.query)));
}

async function lookup(req: Request, res: Response) {
  res.json(await invoiceService.lookupItems(lookupQuery.parse(req.query).q));
}

async function get(req: Request, res: Response) {
  res.json(await invoiceService.getInvoice(idParam(req)));
}

async function create(req: Request, res: Response) {
  res.status(201).json(await invoiceService.createInvoice(req.body as InvoiceBody, req.user!.id));
}

async function update(req: Request, res: Response) {
  res.json(await invoiceService.updateInvoice(idParam(req), req.body as InvoiceBody));
}

async function remove(req: Request, res: Response) {
  await invoiceService.deleteInvoice(idParam(req));
  res.status(204).end();
}

export const invoiceRouter = Router();
invoiceRouter.use(requireAuth);
invoiceRouter.get('/', list);
invoiceRouter.get('/lookup', lookup);
invoiceRouter.post('/', validateBody(invoiceBodySchema), create);
invoiceRouter.get('/:id', get);
invoiceRouter.put('/:id', validateBody(invoiceBodySchema), update);
invoiceRouter.delete('/:id', remove);
