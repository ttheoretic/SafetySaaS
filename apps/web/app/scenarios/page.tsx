import {
  runScenario,
  exampleGraph,
  exampleBusiness,
  ScenarioDefinition,
} from '@failsafe/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';

const IMPACT_LABEL: Record<string, string> = {
  none: 'none',
  degraded: 'low',
  partial_outage: 'high',
  full_outage: 'critical',
};

const LAB: { name: string; prompt: string; definition: ScenarioDefinition }[] = [
  {
    name: 'AWS us-east-1 fails during a viral peak',
    prompt: 'What happens if AWS us-east-1 fails while we get 100x traffic?',
    definition: { steps: [{ type: 'aws_down', durationHours: 3 }, { type: 'traffic_100x' }] },
  },
  {
    name: 'Stripe down for 24 hours',
    prompt: 'What if Stripe is offline for 24 hours?',
    definition: { steps: [{ type: 'stripe_down', durationHours: 24 }] },
  },
  {
    name: 'Database lock during a churn wave',
    prompt: 'What if the database locks up while a churn wave hits?',
    definition: { steps: [{ type: 'db_lock', durationHours: 2 }, { type: 'churn_wave' }] },
  },
  {
    name: '100,000 new users overnight',
    prompt: 'What happens when we get 100,000 new users at once?',
    definition: { steps: [{ type: 'traffic_100x' }, { type: 'viral_peak' }] },
  },
];

function fmt(n: number, c: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ScenariosPage() {
  const runs = LAB.map((s) => ({
    ...s,
    result: runScenario(exampleGraph, s.definition, exampleBusiness),
  }));

  return (
    <>
      <PageHeader
        title="Scenario Laboratory"
        subtitle="Compose your own what-if experiments. Each combines several simulations and aggregates the impact."
      />
      <div className="grid grid-cols-2 gap-4">
        {runs.map((r) => (
          <Card key={r.name} title={r.name}>
            <p className="text-sm italic text-muted">"{r.prompt}"</p>
            <div className="mt-3 flex items-center gap-2">
              <SeverityBadge severity={IMPACT_LABEL[r.result.worstImpact] ?? 'low'} />
              <span className="text-xs text-muted">
                {r.result.steps.length} steps · worst case: {r.result.worstImpact.replace('_', ' ')}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {r.result.steps.map((s, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-slate-300">{s.step.type.replace(/_/g, ' ')}</span>
                  {s.revenue && (
                    <span className="text-bad">{fmt(s.revenue.totalImpact, r.result.currency)}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-border pt-2 text-sm">
              <span className="text-muted">Total business impact: </span>
              <span className="font-semibold text-bad">
                {fmt(r.result.totalRevenueImpact, r.result.currency)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
