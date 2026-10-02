'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { DEFAULT_STATE, INDIAN_STATES, stateForGstin } from '@/lib/indian-states';
import { customerFormSchema, GSTIN_REGEX, type CustomerFormValues } from '@/lib/validations/customer';
import type { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a customer to edit; omit to add a new one */
  customer?: Customer | null;
  onSaved: (customer: Customer) => void;
}

function toFormValues(c?: Customer | null): CustomerFormValues {
  return {
    name: c?.name ?? '',
    mobile: c?.mobile ?? '',
    gstNumber: c?.gstNumber ?? '',
    address: c?.address ?? '',
    city: c?.city ?? '',
    state: c ? (c.state ?? '') : DEFAULT_STATE,
    pincode: c?.pincode ?? '',
    email: c?.email ?? '',
    notes: c?.notes ?? '',
  };
}

/** Add / edit customer form in a modal. */
export function CustomerFormDialog({ open, onOpenChange, customer, onSaved }: CustomerFormDialogProps) {
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: toFormValues(customer),
  });

  // Refill the form each time the dialog opens (for a different customer)
  React.useEffect(() => {
    if (open) reset(toFormValues(customer));
  }, [open, customer, reset]);

  const gstField = register('gstNumber');

  const onSubmit = handleSubmit(async (values) => {
    const body = { ...values, gstNumber: values.gstNumber.toUpperCase() };
    try {
      const saved = await api<Customer>(isEdit ? `/customers/${customer!.id}` : '/customers', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      toast.success(isEdit ? 'Customer updated' : `${saved.name} added`);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          for (const [field, messages] of Object.entries(err.errors)) {
            if (field in values) setError(field as keyof CustomerFormValues, { message: messages[0] });
          }
        } else if (err.status === 409) {
          setError('mobile', { message: err.message });
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Could not save customer');
      }
    }
  });

  const field = (name: keyof CustomerFormValues) => ({
    id: `customer-${name}`,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `customer-${name}-error` : undefined,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'Add customer'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Changes apply to new bills. Bills already made keep the details they were printed with.'
              : 'Only the name is required. Add a GSTIN for business customers.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="customer-name" label="Name *" error={errors.name?.message} className="sm:col-span-2">
              <Input {...field('name')} autoFocus placeholder="e.g. Ramesh Sharma" {...register('name')} />
            </FormField>

            <FormField id="customer-mobile" label="Mobile" error={errors.mobile?.message}>
              <Input {...field('mobile')} type="tel" inputMode="numeric" placeholder="98XXXXXXXX" {...register('mobile')} />
            </FormField>

            <FormField
              id="customer-gstNumber"
              label="GST number"
              error={errors.gstNumber?.message}
              hint="State fills in automatically from the GSTIN"
            >
              <Input
                {...field('gstNumber')}
                placeholder="08ABCDE1234F1Z5"
                maxLength={15}
                className="uppercase"
                {...gstField}
                onChange={(e) => {
                  void gstField.onChange(e);
                  const value = e.target.value.toUpperCase();
                  // Once a full valid GSTIN is typed, select its state
                  if (GSTIN_REGEX.test(value)) {
                    const state = stateForGstin(value);
                    if (state) setValue('state', state, { shouldValidate: true });
                  }
                }}
              />
            </FormField>

            <FormField id="customer-address" label="Address" error={errors.address?.message} className="sm:col-span-2">
              <Textarea {...field('address')} rows={2} placeholder="House / shop, street, area" {...register('address')} />
            </FormField>

            <FormField id="customer-city" label="City" error={errors.city?.message}>
              <Input {...field('city')} placeholder="Jaipur" {...register('city')} />
            </FormField>

            <FormField id="customer-state" label="State" error={errors.state?.message}>
              <NativeSelect {...field('state')} {...register('state')}>
                <option value="">— Select state —</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </NativeSelect>
            </FormField>

            <FormField id="customer-pincode" label="PIN code" error={errors.pincode?.message}>
              <Input {...field('pincode')} inputMode="numeric" maxLength={6} placeholder="302001" {...register('pincode')} />
            </FormField>

            <FormField id="customer-email" label="Email" error={errors.email?.message}>
              <Input {...field('email')} type="email" placeholder="name@example.com" {...register('email')} />
            </FormField>

            <FormField id="customer-notes" label="Notes" error={errors.notes?.message} className="sm:col-span-2">
              <Textarea {...field('notes')} rows={2} placeholder="Anything to remember about this customer" {...register('notes')} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
