import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

/** App wordmark. Replaced by the shop's uploaded logo once Settings (Phase 7) exists. */
export function BrandLogo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          inverted ? 'bg-white/15 text-white' : 'bg-primary text-primary-foreground',
        )}
      >
        <Leaf className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <p className={cn('text-base font-semibold', inverted && 'text-white')}>Khadi Billing</p>
        <p className={cn('text-xs', inverted ? 'text-white/70' : 'text-muted-foreground')}>GST Invoicing</p>
      </div>
    </div>
  );
}
