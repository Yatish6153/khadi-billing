import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  /** Small line under the value, e.g. "3 bills" */
  sub?: string;
  icon: LucideIcon;
  /** "warning" highlights the card (used for low stock) */
  tone?: 'default' | 'warning';
  loading?: boolean;
}

/** A single headline number on the dashboard. */
export function StatCard({ label, value, sub, icon: Icon, tone = 'default', loading }: StatCardProps) {
  const warn = tone === 'warning';

  return (
    <Card className={cn(warn && 'border-[hsl(var(--warning)/0.5)]')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              warn ? 'bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]' : 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>

        {loading ? (
          <>
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-2 h-4 w-16" />
          </>
        ) : (
          <>
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            {sub && <p className={cn('mt-1 text-xs', warn ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground')}>{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
