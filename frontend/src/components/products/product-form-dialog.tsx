'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ChevronDown, ImagePlus, Trash2 } from 'lucide-react';
import { api, apiUpload, ApiError } from '@/lib/api';
import { GST_RATES, UNITS } from '@/lib/products';
import { cn } from '@/lib/utils';
import { productFormSchema, type ProductFormValues } from '@/lib/validations/product';
import type { Category, Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a product to edit; omit to add a new one */
  product?: Product | null;
  categories: Category[];
  onSaved: (product: Product) => void;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function toFormValues(p?: Product | null): ProductFormValues {
  return {
    name: p?.name ?? '',
    sku: p?.sku ?? '',
    barcode: p?.barcode ?? '',
    categoryId: p?.categoryId ? String(p.categoryId) : '',
    hsnCode: p?.hsnCode ?? '',
    gstRate: String(p?.gstRate ?? 5),
    purchasePrice: p ? String(p.purchasePrice) : '',
    sellingPrice: p ? String(p.sellingPrice) : '',
    taxInclusive: p?.taxInclusive ?? true,
    unit: p?.unit ?? 'MTR',
    trackStock: p?.trackStock ?? false,
    openingStock: '',
    lowStockThreshold: String(p?.lowStockThreshold ?? 5),
    isActive: p?.isActive ?? true,
  };
}

/**
 * Add / edit product. The shop only needs name, category and rate, so
 * everything else (GST, HSN, unit, barcode, stock) sits under "More options"
 * with sensible defaults.
 */
export function ProductFormDialog({ open, onOpenChange, product, categories, onSaved }: ProductFormDialogProps) {
  const isEdit = !!product;
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [removeImage, setRemoveImage] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: toFormValues(product) });

  React.useEffect(() => {
    if (!open) return;
    reset(toFormValues(product));
    setImageFile(null);
    setRemoveImage(false);
    setMoreOpen(!!product?.trackStock);
  }, [open, product, reset]);

  // Object URL for the chosen photo, released when it changes
  React.useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const shownImage = previewUrl ?? (!removeImage ? product?.imageUrl : null) ?? null;
  const [unit, trackStock] = watch(['unit', 'trackStock']);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG or WebP image');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image is too large (max 2 MB)');
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
  };

  const onSubmit = handleSubmit(async (v) => {
    const body = {
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      categoryId: v.categoryId ? Number(v.categoryId) : null,
      hsnCode: v.hsnCode,
      gstRate: Number(v.gstRate),
      purchasePrice: v.purchasePrice || '0',
      sellingPrice: v.sellingPrice,
      taxInclusive: v.taxInclusive,
      unit: v.unit,
      trackStock: v.trackStock,
      lowStockThreshold: v.lowStockThreshold || '0',
      isActive: v.isActive,
      ...(isEdit ? {} : { openingStock: v.openingStock || '0' }),
    };

    let saved: Product;
    try {
      saved = await api<Product>(isEdit ? `/products/${product!.id}` : '/products', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fields = Object.keys(err.errors).filter((f) => f in v);
        for (const field of fields) setError(field as keyof ProductFormValues, { message: err.errors[field]![0] });
        // Show "More options" if the problem is in a hidden field
        if (fields.some((f) => !['name', 'categoryId', 'sellingPrice'].includes(f))) setMoreOpen(true);
        if (!fields.length) toast.error(err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Could not save product');
      }
      return;
    }

    // Photo changes are a separate request once the product exists
    try {
      if (imageFile) saved = await apiUpload<Product>(`/products/${saved.id}/image`, imageFile);
      else if (removeImage && product?.imageUrl) saved = await api<Product>(`/products/${saved.id}/image`, { method: 'DELETE' });
    } catch (err) {
      toast.warning(`Product saved, but the photo wasn't: ${err instanceof ApiError ? err.message : 'upload failed'}`);
    }

    toast.success(isEdit ? 'Product updated' : `${saved.name} added`);
    onSaved(saved);
    onOpenChange(false);
  });

  const aria = (name: keyof ProductFormValues) => ({
    id: `product-${name}`,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `product-${name}-error` : undefined,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'Add product'}</DialogTitle>
          <DialogDescription>It will appear in the item list when you make a bill.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            {/* Photo (optional) */}
            <div className="flex shrink-0 flex-col items-center gap-2 sm:w-32">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary"
                aria-label={shownImage ? 'Change photo' : 'Add photo'}
              >
                {shownImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownImage} alt="Product" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-xs">
                    <ImagePlus className="h-6 w-6" /> Photo (optional)
                  </span>
                )}
              </button>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} />
              {shownImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setImageFile(null);
                    setRemoveImage(true);
                  }}
                >
                  <Trash2 /> Remove
                </Button>
              )}
            </div>

            {/* The three fields the shop uses */}
            <div className="flex-1 space-y-4">
              <FormField id="product-name" label="Product name *" error={errors.name?.message}>
                <Input {...aria('name')} autoFocus placeholder="e.g. Khadi Toliya" {...register('name')} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="product-categoryId" label="Category" error={errors.categoryId?.message}>
                  <NativeSelect {...aria('categoryId')} {...register('categoryId')}>
                    <option value="">Uncategorised</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField id="product-sellingPrice" label="Rate (₹) *" error={errors.sellingPrice?.message}>
                  <Input {...aria('sellingPrice')} inputMode="decimal" placeholder="360" {...register('sellingPrice')} />
                </FormField>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" {...register('isActive')} />
                Show in bill item list
              </label>
            </div>
          </div>

          {/* Everything else is optional and hidden by default */}
          <div className="rounded-md border">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              aria-expanded={moreOpen}
            >
              More options <span className="text-xs">(GST, HSN, unit, barcode, stock — not needed)</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />
            </button>

            {moreOpen && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-3">
                <FormField id="product-sku" label="SKU" error={errors.sku?.message} hint={isEdit ? undefined : 'Auto if blank'}>
                  <Input {...aria('sku')} className="uppercase" placeholder="KH-0001" {...register('sku')} />
                </FormField>
                <FormField id="product-unit" label="Unit" error={errors.unit?.message}>
                  <NativeSelect {...aria('unit')} {...register('unit')}>
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField id="product-gstRate" label="GST % (included in rate)" error={errors.gstRate?.message}>
                  <NativeSelect {...aria('gstRate')} {...register('gstRate')}>
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField id="product-hsnCode" label="HSN code" error={errors.hsnCode?.message}>
                  <Input {...aria('hsnCode')} inputMode="numeric" maxLength={8} placeholder="6211" {...register('hsnCode')} />
                </FormField>
                <FormField id="product-barcode" label="Barcode" error={errors.barcode?.message}>
                  <Input {...aria('barcode')} placeholder="Scan or type" {...register('barcode')} />
                </FormField>
                <FormField id="product-purchasePrice" label="Purchase price" error={errors.purchasePrice?.message}>
                  <Input {...aria('purchasePrice')} inputMode="decimal" placeholder="0" {...register('purchasePrice')} />
                </FormField>

                <label className="flex items-center gap-2 text-sm sm:col-span-3">
                  <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" {...register('trackStock')} />
                  Track stock for this item (reduces with every bill, warns when low)
                </label>
                {trackStock && (
                  <>
                    {!isEdit && (
                      <FormField id="product-openingStock" label={`Opening stock (${unit})`} error={errors.openingStock?.message}>
                        <Input {...aria('openingStock')} inputMode="decimal" placeholder="0" {...register('openingStock')} />
                      </FormField>
                    )}
                    <FormField id="product-lowStockThreshold" label="Low stock alert at" error={errors.lowStockThreshold?.message}>
                      <Input {...aria('lowStockThreshold')} inputMode="decimal" placeholder="5" {...register('lowStockThreshold')} />
                    </FormField>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
