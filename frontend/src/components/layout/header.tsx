'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePlus2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPageTitle } from './nav-config';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 print:hidden">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu />
      </Button>

      <h1 className="flex-1 truncate text-lg font-semibold">{getPageTitle(pathname)}</h1>

      <div className="flex items-center gap-1">
        {/* Billing is the most used action, so it's one click from every page */}
        {pathname !== '/billing/new' && (
          <Button asChild size="sm" className="mr-1">
            <Link href="/billing/new">
              <FilePlus2 /> <span className="hidden sm:inline">New Bill</span>
            </Link>
          </Button>
        )}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
