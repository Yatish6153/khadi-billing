import {
  BarChart3,
  Boxes,
  DatabaseBackup,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** false = module not built yet; shown disabled with a "Soon" badge */
  ready: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar. Flip `ready` as each phase ships. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, ready: true }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'New Bill', href: '/billing/new', icon: FilePlus2, ready: true },
      { label: 'Invoices', href: '/invoices', icon: FileText, ready: true },
      { label: 'Customers', href: '/customers', icon: Users, ready: true },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', href: '/products', icon: Package, ready: true },
      { label: 'Inventory', href: '/inventory', icon: Boxes, ready: true },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, ready: false },
      { label: 'Settings', href: '/settings', icon: Settings, ready: false },
      { label: 'Backup', href: '/backup', icon: DatabaseBackup, ready: false },
    ],
  },
];

/** Extra pages that aren't in the sidebar but need a header title. */
const EXTRA_TITLES: Record<string, string> = {
  '/account': 'My Account',
};

export function getPageTitle(pathname: string): string {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  if (/^\/invoices\/\d+\/edit$/.test(pathname)) return 'Edit Bill';
  if (/^\/invoices\/\d+$/.test(pathname)) return 'Bill';
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return item.label;
    }
  }
  return 'Khadi Billing';
}
