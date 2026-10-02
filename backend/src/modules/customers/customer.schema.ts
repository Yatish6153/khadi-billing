import { z } from 'zod';
import { INDIAN_STATES } from '../../constants/indian-states';
import { paginationQuery } from '../../utils/pagination';

/** GSTIN: 2-digit state code + PAN (10) + entity no. + 'Z' + checksum */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const STATE_NAMES = INDIAN_STATES.map((s) => s.name) as [string, ...string[]];

/** Turns "" into undefined so optional fields can be cleared from a form. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullish();

export const customerBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    mobile: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''))
      .refine((v) => v === '' || /^[6-9][0-9]{9}$/.test(v), 'Enter a valid 10-digit mobile number')
      .transform((v) => (v === '' ? null : v))
      .nullish(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email')
      .transform((v) => (v === '' ? null : v))
      .nullish(),
    gstNumber: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === '' || GSTIN_REGEX.test(v), 'Enter a valid 15-character GSTIN')
      .transform((v) => (v === '' ? null : v))
      .nullish(),
    address: optionalText(300),
    city: optionalText(80),
    state: z
      .string()
      .trim()
      .refine((v) => v === '' || STATE_NAMES.includes(v), 'Choose a state from the list')
      .transform((v) => (v === '' ? null : v))
      .nullish(),
    pincode: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[1-9][0-9]{5}$/.test(v), 'Enter a valid 6-digit PIN code')
      .transform((v) => (v === '' ? null : v))
      .nullish(),
    notes: optionalText(500),
  })
  .superRefine((d, ctx) => {
    // A GSTIN's first two digits must match the customer's state
    if (d.gstNumber && d.state) {
      const expected = INDIAN_STATES.find((s) => s.name === d.state)?.code;
      if (expected && d.gstNumber.slice(0, 2) !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gstNumber'],
          message: `GSTIN should start with ${expected} for ${d.state}`,
        });
      }
    }
  });

export const customerListQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['name', 'recent']).default('name'),
});

export type CustomerBody = z.infer<typeof customerBodySchema>;
export type CustomerListQuery = z.infer<typeof customerListQuery>;
