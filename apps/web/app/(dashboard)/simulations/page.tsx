import {
  simulateFailure,
  revenueImpact,
  exampleGraph,
  exampleBusiness,
  SimulationType,
} from '@riscly/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';
import { SystemGraphView } from '@/components/SystemGraphView';

const SCENARIOS: { type: SimulationType; label: string }[] = [
  { type: 'dns', label: 'DNS outage' },
  { type: 'db_lock', label: 'Database lock' },
  { type: 'infra_region', label: 'Region failure' },
  { type: 'stripe_down', label: 'Stripe down' },
  { type: 'aws_down', label: 'AWS down' },
  { type: 'traffic_100x', label: '100x traffic' },
  { type: 'churn_wave', label: 'Churn wave' },
];

const IMPACT_LABEL: Record<string, string> = {
  none: 'none',
  degraded: 'low',
  partial_outage: 'high',
  full_outage: 'critical',
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SimulationsPage() {
  const runs = SCENARIOS.map(({ type, label }) => {
    const result = simulateFailure(exampleGraph, type);
    const revenue = revenueImpact(result, exampleBusiness, 1);
    return { type, label, result, revenue };
  });

  // Show the graph with the worst scenario highlighted.
  const worst = [...runs].sort(
    (a, b) => b.result.blastRadius - a.result.blastRadius,
  )[0];

  return (
    <>
      <PageHeader
        title="Failure Simulations"
        subtitle="Simulated outages, surges and business shocks against the system model."
      />

      <Card title={`Blast radius — worst case: ${worst.label}`} className="mb-6">
        <SystemGraphView graph={exampleGraph} affected={worst.result.affectedNodeIds} />
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {runs.map((r) => (
          <Card key={r.type} title={r.label}>
            <div className="mb-2 flex items-center gap-2">
              <SeverityBadge severity={IMPACT_LABEL[r.result.impact] ?? 'low'} />
              <span className="text-xs text-muted">
                blast radius {Math.round(r.result.blastRadius * 100)}%
              </span>
            </div>
            <p className="text-sm text-slate-300">{r.result.narrative}</p>
            <div className="mt-3 text-sm">
              <span className="text-muted">Est. 1h revenue impact: </span>
              <span className="font-semibold text-bad">
                {fmt(r.revenue.totalImpact, r.revenue.currency)}
              </span>
            </div>
            {r.result.mitigations.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-muted">
                {r.result.mitigations.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
