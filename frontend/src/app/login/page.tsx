import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FileCheck2, IndianRupee, PackageCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { BrandLogo } from '@/components/layout/brand-logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export const metadata: Metadata = { title: 'Sign in' };

const HIGHLIGHTS = [
  { icon: FileCheck2, text: 'GST-compliant invoices with CGST, SGST & IGST' },
  { icon: PackageCheck, text: 'Stock updates automatically with every bill' },
  { icon: IndianRupee, text: 'Daily, monthly and GST reports in one click' },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <BrandLogo inverted />
        <div className="space-y-6">
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-white">
            Simple, reliable billing for your Khadi Bhandar.
          </h2>
          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <Icon className="h-5 w-5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">Khadi — the fabric of the nation.</p>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center bg-canvas p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <BrandLogo />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage bills, stock and reports.</p>
          </div>

          {/* useSearchParams() inside LoginForm requires a Suspense boundary */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
