'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatQty } from '@/lib/format';
import { cn } from '@/lib/utils';
import { stockAdjustSchema, type StockAdjustValues } from '@/lib/validations/product';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

const MODES = [
  { value: 'add', label: 'Add stock', hint: 'New stock received' },
  { value: 'remove', label: 'Remove', hint: 'Damaged, lost or returned to supplier' },
  { value: 'set', label: 'Set count', hint: 'Correct to a physical count' },
] as const;

interface StockAdjustDialogProps {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (product: Product) => void;
}

/** Add / remove / set stock for one product. Every change is saved in the stock history. */
export function StockAdjustDialog({ product, onOpenChange, onSaved }: StockAdjustDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StockAdjustValues>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: { mode: 'add', quantity: '', note: '' },
  });

  React.useEffect(() => {
    if (product) reset({ mode: 'add', quantity: '', note: '' });
  }, [product, reset]);

  const [mode, quantity] = watch(['mode', 'quantity']);
  const current = product?.stockQuantity ?? 0;
  const qty = Number(quantity);
  const next =
    quantity === '' || Number.isNaN(qty) ? null : mode === 'add' ? current + qty : mode === 'remove' ? current - qty : qty;

  const onSubmit = handleSubmit(async (values) => {
    if (!product) return;
    try {
      const saved = await api<Product>(`/products/${product.id}/stock`, { method: 'POST', body: values });
      toast.success(`${saved.name}: stock is now ${formatQty(saved.stockQuantity)} ${saved.unit}`);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.errors?.quantity) setError('quantity', { message: err.errors.quantity[0] });
      else toast.error(err instanceof ApiError ? err.message : 'Could not update stock');
    }
  });

  return (
    <Dialog open={!!product} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product?.name} · currently{' '}
            <span className="font-medium text-foreground">
              {formatQty(current)} {product?.unit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type of change">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => setValue('mode', m.value)}
                className={cn(
                  'rounded-md border px-2 py-2 text-sm font-medium transition-colors',
                  mode === m.value ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{MODES.find((m) => m.value === mode)?.hint}</p>

          <FormField
            id="stock-quantity"
            label={mode === 'set' ? `Actual count (${product?.unit ?? ''})` : `Quantity (${product?.unit ?? ''})`}
            error={errors.quantity?.message}
          >
            <Input
              id="stock-quantity"
              inputMode="decimal"
              autoFocus
              placeholder="0"
              aria-invalid={!!errors.quantity}
              {...register('quantity')}
            />
          </FormField>

          {next !== null && (
            <div
              className={cn(
                'flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm tabular-nums',
                next < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/60',
              )}
            >
              <span>{formatQty(current)}</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
              <span className="font-semibold">
                {formatQty(next)} {product?.unit}
              </span>
            </div>
          )}

          <FormField id="stock-note" label="Note (optional)" error={errors.note?.message}>
            <Input id="stock-note" placeholder="e.g. Received from KVIC depot" {...register('note')} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
