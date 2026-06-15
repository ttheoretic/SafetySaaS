import { TrendingDown } from 'lucide-react';
import { revenue, worstRevenue, money } from '@/lib/dashboard-data';

export function RevenueImpact() {
  const max = Math.max(...revenue.map((r) => r.amount), 1);
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <TrendingDown className="size-4 text-primary" />
        Revenue at Risk
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Estimated business impact per failure scenario.</p>

      <div className="mt-4">
        <span className="font-mono text-3xl font-semibold tabular-nums text-destructive">{money(worstRevenue)}</span>
        <span className="ml-2 text-xs text-muted-foreground">worst single event</span>
      </div>

      <div className="mt-5 space-y-3">
        {revenue.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{r.label} · {r.hours}h</span>
              <span className="font-mono tabular-nums text-foreground">{money(r.amount)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-destructive/70" style={{ width: `${(r.amount / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
