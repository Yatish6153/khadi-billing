'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { FormField } from '@/components/ui/form-field';

const FIELDS: { name: keyof ChangePasswordValues; label: string; autoComplete: string; hint?: string }[] = [
  { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  {
    name: 'newPassword',
    label: 'New password',
    autoComplete: 'new-password',
    hint: 'At least 8 characters, with a letter and a number.',
  },
  { name: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
];

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      const res = await api<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      toast.success(res.message);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        // Show server-side field errors next to the matching inputs
        for (const [field, messages] of Object.entries(err.errors)) {
          const known = FIELDS.find((f) => f.name === field);
          if (known) setError(known.name, { message: messages[0] });
        }
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Could not change password');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5" noValidate>
      {FIELDS.map((f) => (
        <FormField key={f.name} id={f.name} label={f.label} error={errors[f.name]?.message} hint={f.hint}>
          <PasswordInput
            id={f.name}
            autoComplete={f.autoComplete}
            aria-invalid={!!errors[f.name]}
            aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
            {...register(f.name)}
          />
        </FormField>
      ))}

      <Button type="submit" loading={isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
