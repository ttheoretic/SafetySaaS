import { Check, Minus } from 'lucide-react';
import {
  PLAN_ORDER,
  PLAN_LIMITS,
  AI_TIER_LABEL,
  MONITORING_LABEL,
  ALERTS_LABEL,
  historyLabel,
  type Plan,
  type PlanLimits,
} from '@riscly/shared';

type Cell = string | boolean;

const ROWS: { label: string; value: (l: PlanLimits) => Cell }[] = [
  { label: 'Price', value: (l) => (l.priceEur === null ? 'Custom' : `€${l.priceEur}/mo`) },
  { label: 'AI model', value: (l) => AI_TIER_LABEL[l.aiTier] },
  { label: 'Monitoring', value: (l) => MONITORING_LABEL[l.monitoring] },
  { label: 'Revenue Impact', value: (l) => l.revenueImpact },
  { label: 'Scenario Lab', value: (l) => l.scenarioLab },
  { label: 'Failure Simulation', value: (l) => l.simulations },
  { label: 'Reports', value: (l) => l.reports },
  { label: 'Alerts', value: (l) => ALERTS_LABEL[l.alerts] },
  { label: 'Members', value: (l) => (l.maxMembers === Infinity ? '∞' : String(l.maxMembers)) },
  { label: 'History', value: (l) => historyLabel(l.historyDays) },
];

function planName(plan: Plan): string {
  return plan[0].toUpperCase() + plan.slice(1);
}

function Value({ cell }: { cell: Cell }) {
  if (cell === true) return <Check className="mx-auto size-4 text-primary" />;
  if (cell === false) return <Minus className="mx-auto size-4 text-muted-foreground/50" />;
  return <span className="text-foreground">{cell}</span>;
}

/** Full feature-by-feature comparison of every plan. */
export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-card">
            <th className="px-5 py-4 text-left font-medium text-muted-foreground">Plan</th>
            {PLAN_ORDER.map((plan) => (
              <th
                key={plan}
                className={`px-5 py-4 text-center font-semibold ${
                  plan === 'growth' ? 'text-primary' : 'text-foreground'
                }`}
              >
                {planName(plan)}
                {plan === 'growth' && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Popular
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 ? 'bg-card/40' : ''}>
              <td className="px-5 py-3 text-left font-medium text-muted-foreground">{row.label}</td>
              {PLAN_ORDER.map((plan) => (
                <td key={plan} className="px-5 py-3 text-center">
                  <Value cell={row.value(PLAN_LIMITS[plan])} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
