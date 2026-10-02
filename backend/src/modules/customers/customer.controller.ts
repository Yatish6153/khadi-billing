import type { Request, Response } from 'express';
import * as customerService from './customer.service';
import { customerListQuery, type CustomerBody } from './customer.schema';
import { paginationQuery } from '../../utils/pagination';
import { idParam } from '../../utils/params';

export async function list(req: Request, res: Response) {
  res.json(await customerService.listCustomers(customerListQuery.parse(req.query)));
}

export async function get(req: Request, res: Response) {
  res.json(await customerService.getCustomer(idParam(req)));
}

export async function invoices(req: Request, res: Response) {
  res.json(await customerService.getCustomerInvoices(idParam(req), paginationQuery.parse(req.query)));
}

export async function create(req: Request, res: Response) {
  const customer = await customerService.createCustomer(req.body as CustomerBody);
  res.status(201).json(customer);
}

export async function update(req: Request, res: Response) {
  res.json(await customerService.updateCustomer(idParam(req), req.body as CustomerBody));
}

export async function remove(req: Request, res: Response) {
  await customerService.deleteCustomer(idParam(req));
  res.status(204).end();
}
