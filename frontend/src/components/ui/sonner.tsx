'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

/** App-wide toast notifications that follow the light/dark theme. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="top-right"
      richColors
      closeButton
    />
  );
}
