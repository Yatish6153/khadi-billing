'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Category } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onChanged: () => void;
}

/** Add, rename and delete product categories. */
export function CategoriesDialog({ open, onOpenChange, categories, onChanged }: CategoriesDialogProps) {
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChanged();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (await run(() => api('/categories', { method: 'POST', body: { name } }), `Added “${name}”`)) setNewName('');
  };

  const rename = async (c: Category) => {
    const name = editName.trim();
    if (!name || name === c.name) return setEditingId(null);
    if (await run(() => api(`/categories/${c.id}`, { method: 'PUT', body: { name } }), 'Category renamed')) setEditingId(null);
  };

  const remove = async (c: Category) => {
    const msg =
      c.productCount > 0
        ? `Delete “${c.name}”? Its ${c.productCount} products will become Uncategorised.`
        : `Delete “${c.name}”?`;
    if (!window.confirm(msg)) return;
    await run(() => api(`/categories/${c.id}`, { method: 'DELETE' }), 'Category deleted');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>Group products to filter and report on them.</DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name" maxLength={80} aria-label="New category name" />
          <Button type="submit" disabled={busy || !newName.trim()}>
            <Plus /> Add
          </Button>
        </form>

        <ul className="max-h-80 divide-y overflow-y-auto rounded-md border">
          {categories.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No categories yet</li>}
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editingId === c.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void rename(c);
                      }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="h-8"
                    autoFocus
                    aria-label="Category name"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rename(c)} disabled={busy} aria-label="Save">
                    <Check />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} aria-label="Cancel">
                    <X />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{c.productCount}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    aria-label={`Rename ${c.name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => remove(c)}
                    disabled={busy}
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
