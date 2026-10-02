import { z } from 'zod';
import { codeForState } from '@/lib/indian-states';

// Mirrors backend/src/modules/customers/customer.schema.ts for instant feedback.

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const cleanMobile = (v: string) => v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');

export const customerFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    mobile: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[6-9][0-9]{9}$/.test(cleanMobile(v)), 'Enter a valid 10-digit mobile number'),
    gstNumber: z
      .string()
      .trim()
      .refine((v) => v === '' || GSTIN_REGEX.test(v.toUpperCase()), 'Enter a valid 15-character GSTIN'),
    address: z.string().trim().max(300, 'Address is too long'),
    city: z.string().trim().max(80),
    state: z.string(),
    pincode: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[1-9][0-9]{5}$/.test(v), 'Enter a valid 6-digit PIN code'),
    email: z
      .string()
      .trim()
      .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email'),
    notes: z.string().trim().max(500),
  })
  .superRefine((d, ctx) => {
    if (d.gstNumber && d.state) {
      const expected = codeForState(d.state);
      if (expected && d.gstNumber.toUpperCase().slice(0, 2) !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gstNumber'],
          message: `GSTIN should start with ${expected} for ${d.state}`,
        });
      }
    }
  });

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
