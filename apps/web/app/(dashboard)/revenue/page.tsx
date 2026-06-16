import {
  simulateFailure,
  revenueImpact,
  exampleGraph,
  exampleBusiness,
  SimulationType,
} from '@riscly/shared';
import { PageHeader, Card, Stat } from '@/components/ui';

const SCENARIOS: { type: SimulationType; label: string; hours: number }[] = [
  { type: 'dns', label: 'Full outage (DNS)', hours: 2 },
  { type: 'db_lock', label: 'Database down', hours: 3 },
  { type: 'stripe_down', label: 'Stripe down', hours: 24 },
  { type: 'infra_region', label: 'Region failure', hours: 4 },
  { type: 'churn_wave', label: 'Churn wave', hours: 1 },
];

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RevenuePage() {
  const c = exampleBusiness.currency ?? 'EUR';
  const rows = SCENARIOS.map((s) => {
    const result = simulateFailure(exampleGraph, s.type);
    const revenue = revenueImpact(result, exampleBusiness, s.hours);
    return { ...s, revenue };
  });

  return (
    <>
      <PageHeader
        title="Revenue Risk"
        subtitle={`Modeled on MRR ${fmt(exampleBusiness.monthlyRevenue, c)} · ${exampleBusiness.activeUsers} active users.`}
      />
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Monthly revenue" value={fmt(exampleBusiness.monthlyRevenue, c)} />
        <Stat
          label="Worst-case single event"
          value={fmt(Math.max(...rows.map((r) => r.revenue.totalImpact)), c)}
        />
        <Stat label="Modeled scenarios" value={rows.length} />
      </div>

      <Card title="Revenue impact by scenario" className="mt-6">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-border">
              <th className="py-2">Scenario</th>
              <th>Hours</th>
              <th>Direct loss</th>
              <th>Conversion loss</th>
              <th>SLA credits</th>
              <th>Churn risk</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type} className="border-b border-border last:border-0">
                <td className="py-2 text-white">{r.label}</td>
                <td>{r.hours}h</td>
                <td>{fmt(r.revenue.directLoss, c)}</td>
                <td>{fmt(r.revenue.conversionLoss, c)}</td>
                <td>{fmt(r.revenue.slaCredits, c)}</td>
                <td>{fmt(r.revenue.churnRiskCost, c)}</td>
                <td className="text-right font-semibold text-bad">
                  {fmt(r.revenue.totalImpact, c)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
