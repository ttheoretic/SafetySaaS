'use client';

import { Users } from 'lucide-react';
import { simulateFailure, revenueImpact, SimulationType } from '@riscly/shared';
import { PageHeader, Card, Stat } from '@/components/ui';
import { useDashboardStore } from '@/lib/dashboard-store';
import { money } from '@/lib/dashboard-data';

const SCENARIOS: { type: SimulationType; label: string; hours: number }[] = [
  { type: 'churn_wave', label: 'Churn wave', hours: 1 },
  { type: 'refund_spike', label: 'Refund spike', hours: 1 },
  { type: 'payment_failure', label: 'Payment failures', hours: 4 },
  { type: 'dns', label: 'Full outage', hours: 4 },
  { type: 'stripe_down', label: 'Payments down (24h)', hours: 24 },
];

export default function ChurnPage() {
  const graph = useDashboardStore((s) => s.graph);
  const business = useDashboardStore((s) => s.business);
  const c = business.currency ?? 'EUR';
  const mrr = business.monthlyRevenue;

  const rows = SCENARIOS.map((s) => {
    const rev = revenueImpact(simulateFailure(graph, s.type), business, s.hours);
    const pct = (rev.churnRiskCost / mrr) * 100;
    return { ...s, cost: rev.churnRiskCost, pct, annualized: rev.churnRiskCost * 12 };
  }).sort((a, b) => b.cost - a.cost);

  const totalMonthly = Math.round(rows.reduce((s, r) => s + r.cost, 0));
  const worstPct = Math.max(...rows.map((r) => r.pct));

  return (
    <>
      <PageHeader title="Churn Risk" subtitle="How failure and business shocks translate into customer churn." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Monthly churn exposure" value={money(totalMonthly, c)} />
        <Stat label="Worst-case churn rate" value={`${worstPct.toFixed(1)}%`} />
        <Stat label="Annualized exposure" value={money(totalMonthly * 12, c)} />
      </div>

      <Card title="Churn impact by scenario" className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" /> incremental churn cost</div>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border"><th className="py-2">Scenario</th><th>Churn rate</th><th>Monthly cost</th><th className="text-right">Annualized</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type} className="border-b border-border last:border-0">
                <td className="py-2 text-foreground">{r.label}</td>
                <td className="font-mono tabular-nums text-warning">{r.pct.toFixed(1)}%</td>
                <td className="font-mono tabular-nums text-destructive">{money(r.cost, c)}</td>
                <td className="text-right font-mono tabular-nums text-destructive">{money(r.annualized, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
