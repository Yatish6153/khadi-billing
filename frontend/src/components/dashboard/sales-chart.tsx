'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDayKey, formatINR, formatINRCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DailySales } from '@/types/dashboard';

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

interface SalesChartProps {
  data: DailySales[] | undefined;
  days: RangeDays;
  onDaysChange: (days: RangeDays) => void;
  loading: boolean;
}

/** Hover tooltip: date, amount and number of bills for one day. */
function DayTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const day = payload?.[0]?.payload as DailySales | undefined;
  if (!active || !day) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{formatDayKey(day.date, true)}</p>
      <p className="font-semibold tabular-nums">{formatINR(day.sales)}</p>
      <p className="text-xs text-muted-foreground">
        {day.bills} {day.bills === 1 ? 'bill' : 'bills'}
      </p>
    </div>
  );
}

/** Daily sales bar chart with a 7 / 30 / 90 day range switch. */
export function SalesChart({ data, days, onDaysChange, loading }: SalesChartProps) {
  const total = data?.reduce((sum, d) => sum + d.sales, 0) ?? 0;
  const bills = data?.reduce((sum, d) => sum + d.bills, 0) ?? 0;
  const isEmpty = !!data && total === 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Sales</CardTitle>
          {data ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{formatINR(total, { whole: true })}</span> in
              the last {days} days · {bills} {bills === 1 ? 'bill' : 'bills'}
            </p>
          ) : (
            <Skeleton className="mt-2 h-4 w-48" />
          )}
        </div>

        <div className="inline-flex rounded-md border bg-muted/50 p-0.5" role="group" aria-label="Date range">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onDaysChange(opt)}
              aria-pressed={days === opt}
              className={cn(
                'rounded px-3 py-1 text-xs font-medium transition-colors',
                days === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt}D
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 pt-2">
        {!data ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <div className={cn('h-[260px] w-full transition-opacity', loading && 'opacity-60')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={days === 7 ? '30%' : 2}>
                <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => formatDayKey(v)}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickFormatter={(v: number) => formatINRCompact(v)}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={DayTooltip} />
                <Bar dataKey="sales" name="Sales" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <p className="rounded-md bg-background/90 px-4 py-2 text-center text-sm text-muted-foreground shadow-sm">
              No sales in this period yet. Bills you create will appear here.
            </p>
          </div>
        )}

        {/* Screen-reader table of the same data */}
        {data && (
          <table className="sr-only">
            <caption>Daily sales, last {days} days</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Sales</th>
                <th scope="col">Bills</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <td>{formatDayKey(d.date, true)}</td>
                  <td>{formatINR(d.sales)}</td>
                  <td>{d.bills}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
