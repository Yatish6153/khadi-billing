import { z } from 'zod';

/** Standard ?page=&pageSize= query params, shared by every list endpoint. */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationQuery>;

export function toSkipTake({ page, pageSize }: Pagination) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** Shape of every paginated response: { items, total, page, pageSize } */
export function paginated<T>(items: T[], total: number, { page, pageSize }: Pagination) {
  return { items, total, page, pageSize };
}
