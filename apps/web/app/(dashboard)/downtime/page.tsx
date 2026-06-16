'use client';

import { Clock } from 'lucide-react';
import { simulateFailure, revenueImpact, exampleBusiness, SimulationType } from '@riscly/shared';
import { PageHeader, Card, Stat } from '@/components/ui';
import { useDashboardStore } from '@/lib/dashboard-store';
import { money } from '@/lib/dashboard-data';

const SCENARIOS: { type: SimulationType; label: string }[] = [
  { type: 'dns', label: 'Full outage (DNS)' },
  { type: 'db_lock', label: 'Database down' },
  { type: 'infra_region', label: 'Region failure' },
  { type: 'stripe_down', label: 'Payments down' },
  { type: 'cache', label: 'Cache outage' },
];

export default function DowntimePage() {
  const graph = useDashboardStore((s) => s.graph);
  const c = exampleBusiness.currency ?? 'EUR';
  const rows = SCENARIOS.map((s) => {
    const sim = simulateFailure(graph, s.type);
    const hourly = revenueImpact(sim, exampleBusiness, 1).totalImpact;
    return { ...s, hourly, impact: sim.impact };
  }).sort((a, b) => b.hourly - a.hourly);

  const avgHourly = Math.round(rows.reduce((s, r) => s + r.hourly, 0) / rows.length);
  const worstHourly = rows[0]?.hourly ?? 0;
  const monthlyEst = Math.round(worstHourly * 2.5);

  return (
    <>
      <PageHeader title="Downtime Cost" subtitle="What every hour of downtime costs, by failure mode." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Avg cost / downtime-hour" value={money(avgHourly, c)} />
        <Stat label="Worst cost / hour" value={money(worstHourly, c)} />
        <Stat label="Est. monthly downtime cost" value={money(monthlyEst, c)} />
      </div>

      <Card title="Cost per downtime-hour by scenario" className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" /> 1-hour outage impact</div>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border"><th className="py-2">Scenario</th><th>Impact</th><th className="text-right">Cost / hour</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type} className="border-b border-border last:border-0">
                <td className="py-2 text-foreground">{r.label}</td>
                <td className="capitalize text-muted-foreground">{r.impact.replace('_', ' ')}</td>
                <td className="text-right font-mono tabular-nums text-destructive">{money(r.hourly, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
