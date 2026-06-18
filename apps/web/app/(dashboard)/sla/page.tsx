'use client';

import { Gauge } from 'lucide-react';
import { reliabilityScore, simulateFailure, revenueImpact } from '@riscly/shared';
import { PageHeader, Card, Stat } from '@/components/ui';
import { useDashboardStore } from '@/lib/dashboard-store';
import { money } from '@/lib/dashboard-data';

const TIERS = [
  { sla: '99.9%', downtime: '43m 50s / mo', creditRate: 0.10 },
  { sla: '99.95%', downtime: '21m 54s / mo', creditRate: 0.15 },
  { sla: '99.99%', downtime: '4m 23s / mo', creditRate: 0.25 },
];

export default function SlaPage() {
  const graph = useDashboardStore((s) => s.graph);
  const business = useDashboardStore((s) => s.business);
  const c = business.currency ?? 'EUR';
  const rel = reliabilityScore(graph);

  // SLA credit exposure for a 24h breach at each tier's credit rate.
  const sim = simulateFailure(graph, 'dns');
  const exposure = TIERS.map((t) => ({
    ...t,
    credit: revenueImpact(sim, { ...business, slaCreditRatePerHour: t.creditRate / 24 }, 24).slaCredits,
  }));

  // Modeled monthly downtime risk derived from the reliability score.
  const riskMinutes = Math.round((100 - rel.score) * 2.2);

  return (
    <>
      <PageHeader title="SLA Impact" subtitle="SLA tiers, error budgets and the credit exposure of a breach." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Reliability score" value={`${rel.score}/100`} />
        <Stat label="Modeled risk" value={`~${riskMinutes} min/mo`} />
        <Stat label="SPOFs on critical path" value={rel.summary.spofCount} />
      </div>

      <Card title="SLA tiers & breach credit exposure" className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Gauge className="size-3.5" /> credit owed for a 24h breach</div>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border"><th className="py-2">SLA</th><th>Error budget</th><th>Credit rate</th><th className="text-right">Breach exposure</th></tr>
          </thead>
          <tbody>
            {exposure.map((t) => (
              <tr key={t.sla} className="border-b border-border last:border-0">
                <td className="py-2 font-mono text-foreground">{t.sla}</td>
                <td className="text-muted-foreground">{t.downtime}</td>
                <td className="text-muted-foreground">{Math.round(t.creditRate * 100)}% of bill</td>
                <td className="text-right font-mono tabular-nums text-destructive">{money(t.credit, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          At a {rel.score}/100 reliability score, the modeled monthly downtime risk{' '}
          {riskMinutes > 4 ? 'exceeds' : 'fits within'} a 99.99% error budget.
        </p>
      </Card>
    </>
  );
}
