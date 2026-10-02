'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';

export interface Suggestion {
  key: string;
  /** Main text */
  label: string;
  /** Small grey text on the right (rate, stock, mobile …) */
  hint?: string;
  /** Optional heading shown above the first item of a group */
  group?: string;
}

interface SuggestInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Returns suggestions for the typed text ('' = the full pick list) */
  fetchSuggestions: (query: string) => Promise<Suggestion[]>;
  onPick: (suggestion: Suggestion) => void;
  /** Called on Enter when no suggestion is highlighted (e.g. move to the next cell) */
  onEnter?: () => void;
  /** Show the full list as soon as the empty box is clicked, like a dropdown */
  openOnFocus?: boolean;
}

/**
 * Text box with a keyboard-friendly suggestion list (↑ ↓ Enter Esc).
 * Typing anything free-form is always allowed — suggestions only help.
 */
export const SuggestInput = React.forwardRef<HTMLInputElement, SuggestInputProps>(function SuggestInput(
  { value, onValueChange, fetchSuggestions, onPick, onEnter, openOnFocus = false, className, onKeyDown, onBlur, onFocus, ...props },
  ref,
) {
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const typed = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const listId = React.useId();

  const setRefs = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  /** Fetches and shows suggestions, unless the user has already left this box. */
  const load = React.useCallback(
    async (query: string, isCancelled: () => boolean = () => false) => {
      try {
        const result = await fetchSuggestions(query);
        if (isCancelled() || document.activeElement !== inputRef.current) return;
        setItems(result);
        setActive(-1);
        setOpen(result.length > 0);
      } catch {
        /* suggestions are optional */
      }
    },
    [fetchSuggestions],
  );

  // Fetch suggestions shortly after the user stops typing
  React.useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (!q && !openOnFocus) {
      setItems([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => void load(q, () => cancelled), 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, openOnFocus, load]);

  // Keep the highlighted option visible while using the arrow keys
  React.useEffect(() => {
    if (active < 0) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (s: Suggestion) => {
    typed.current = false;
    setOpen(false);
    onPick(s);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && items.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        pick(items[active]!);
        return;
      }
    } else if (openOnFocus && e.key === 'ArrowDown') {
      // ↓ on a closed box opens the list
      e.preventDefault();
      void load(value.trim());
      return;
    }
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      setOpen(false);
      onEnter();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <Input
        ref={setRefs}
        value={value}
        onChange={(e) => {
          typed.current = true;
          onValueChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          if (openOnFocus && !value.trim()) void load('');
          onFocus?.(e);
        }}
        onClick={() => {
          if (openOnFocus && !open) void load(value.trim());
        }}
        onBlur={(e) => {
          // Delay so a click on a suggestion still registers
          setTimeout(() => setOpen(false), 150);
          onBlur?.(e);
        }}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={cn(openOnFocus && 'pr-8', className)}
        {...props}
      />
      {openOnFocus && (
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      )}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 min-w-[16rem] overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-lg"
        >
          {items.map((s, i) => (
            <React.Fragment key={s.key}>
              {s.group && (i === 0 || items[i - 1]!.group !== s.group) && (
                <li className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.group}
                </li>
              )}
              <li
                role="option"
                data-index={i}
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5',
                  i === active && 'bg-accent text-accent-foreground',
                )}
              >
                <span className="truncate">{s.label}</span>
                {s.hint && <span className="shrink-0 text-xs text-muted-foreground">{s.hint}</span>}
              </li>
            </React.Fragment>
          ))}
        </ul>
      )}
    </div>
  );
});
