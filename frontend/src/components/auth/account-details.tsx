'use client';

import { useAuth } from '@/components/providers/auth-provider';

export function AccountDetails() {
  const { user } = useAuth();

  const rows = [
    { label: 'Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role === 'ADMIN' ? 'Administrator' : 'Staff' },
    {
      label: 'Last sign-in',
      value: user.lastLoginAt
        ? new Date(user.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '—',
    },
  ];

  return (
    <dl className="space-y-4 text-sm">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 break-words font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
