import { TrendingDown } from 'lucide-react';
import {
  simulateFailure,
  revenueImpact,
  exampleGraph,
  exampleBusiness,
  SimulationType,
} from '@failsafe/shared';

const SCENARIOS: { type: SimulationType; label: string; hours: number }[] = [
  { type: 'dns', label: 'Full outage (DNS)', hours: 2 },
  { type: 'db_lock', label: 'Database down', hours: 3 },
  { type: 'stripe_down', label: 'Stripe down', hours: 24 },
  { type: 'infra_region', label: 'Region failure', hours: 4 },
  { type: 'churn_wave', label: 'Churn wave', hours: 1 },
];

function money(n: number) {
  return new Intl.NumberFormat('en', { style: 'currency', currency: exampleBusiness.currency ?? 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function RevenueDemo() {
  const rows = SCENARIOS.map((s) => ({
    ...s,
    rev: revenueImpact(simulateFailure(exampleGraph, s.type), exampleBusiness, s.hours),
  })).sort((a, b) => b.rev.totalImpact - a.rev.totalImpact);
  const max = Math.max(...rows.map((r) => r.rev.totalImpact), 1);
  const worst = rows[0];

  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-primary">Revenue impact</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Every risk, priced in euros.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Riscly translates each failure mode into direct revenue loss, lost conversions, SLA
              credits and churn — so you fix the expensive risks first, not the loudest ones.
            </p>
            <div className="mt-8 rounded-xl border border-border/60 bg-card p-5">
              <div className="text-xs text-muted-foreground">Worst-case single event</div>
              <div className="mt-1 font-mono text-3xl font-semibold text-destructive">{money(worst.rev.totalImpact)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{worst.label} · {worst.hours}h</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="size-4 text-primary" /> Modeled on €50k MRR · 4,000 users
            </div>
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono tabular-nums text-foreground">{money(r.rev.totalImpact)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-destructive/70" style={{ width: `${(r.rev.totalImpact / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
