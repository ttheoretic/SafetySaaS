'use client';

import { TrendingDown } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';
import { money } from '@/lib/dashboard-data';
import { Sparkline, trendTo } from '@/components/ui/sparkline';

export function RevenueImpactTrends() {
  const d = useDashboard();
  const c = d.currency;
  const top = d.revenue.slice(0, 4);

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <TrendingDown className="size-4 text-destructive" /> Revenue Impact
        </div>
        <span className="text-[11px] text-muted-foreground">worst-case events</span>
      </div>

      <div className="px-5 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              {money(d.worstRevenue, c)}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">peak single-event exposure</p>
          </div>
          <Sparkline data={trendTo(Math.max(1, d.worstRevenue))} color="var(--risk-critical)" width={110} height={36} />
        </div>
      </div>

      <ul className="mt-3 divide-y divide-border/60 px-5 pb-4">
        {top.map((r) => {
          const pct = Math.round((r.amount / (d.worstRevenue || 1)) * 100);
          return (
            <li key={r.label} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm text-foreground">{r.label}</span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{money(r.amount, c)}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-destructive/70" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
