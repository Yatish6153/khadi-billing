import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Small square product image, or a placeholder icon when there's no photo. */
export function ProductThumb({ src, name, className }: { src: string | null; name: string; className?: string }) {
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own API, no optimisation needed
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Package className="h-4 w-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}
