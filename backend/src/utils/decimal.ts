import type { Prisma } from '@prisma/client';

/**
 * Prisma returns Decimal columns as Decimal objects (serialised as strings).
 * Use this for display figures only — never for billing arithmetic.
 */
export function toNumber(value: Prisma.Decimal | number | bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
}
