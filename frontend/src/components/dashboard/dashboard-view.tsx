'use client';

import * as React from 'react';
import { AlertTriangle, CalendarDays, IndianRupee, Package, RefreshCw, Users } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatINR } from '@/lib/format';
import type { DashboardSummary } from '@/types/dashboard';
import { StatCard } from './stat-card';
import { SalesChart, type RangeDays } from './sales-chart';
import { RecentBills } from './recent-bills';
import { LowStockList } from './low-stock-list';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function DashboardView() {
  const { user } = useAuth();
  const [days, setDays] = React.useState<RangeDays>(30);
  const { data, error, loading, reload } = useApi<DashboardSummary>(`/dashboard/summary?days=${days}`);

  const firstLoad = !data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {user.name.split(' ')[0]}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={reload} loading={loading && !firstLoad} disabled={loading}>
          {!(loading && !firstLoad) && <RefreshCw />}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {error}
            </span>
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5" aria-label="Summary">
        <StatCard
          label="Today's sales"
          icon={IndianRupee}
          loading={firstLoad}
          value={formatINR(data?.today.sales ?? 0, { whole: true })}
          sub={data ? plural(data.today.bills, 'bill') : undefined}
        />
        <StatCard
          label="This month"
          icon={CalendarDays}
          loading={firstLoad}
          value={formatINR(data?.month.sales ?? 0, { whole: true })}
          sub={data ? plural(data.month.bills, 'bill') : undefined}
        />
        <StatCard
          label="Customers"
          icon={Users}
          loading={firstLoad}
          value={String(data?.totalCustomers ?? 0)}
          sub="saved customers"
        />
        <StatCard
          label="Products"
          icon={Package}
          loading={firstLoad}
          value={String(data?.totalProducts ?? 0)}
          sub="active products"
        />
        <StatCard
          label="Low stock"
          icon={AlertTriangle}
          loading={firstLoad}
          value={String(data?.lowStock.count ?? 0)}
          tone={data && data.lowStock.count > 0 ? 'warning' : 'default'}
          sub={data ? (data.lowStock.count > 0 ? 'need restocking' : 'all good') : undefined}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={data?.salesTrend} days={days} onDaysChange={setDays} loading={loading} />
        </div>
        <LowStockList items={data?.lowStock.items} total={data?.lowStock.count} />
      </section>

      <RecentBills invoices={data?.recentInvoices} />
    </div>
  );
}
