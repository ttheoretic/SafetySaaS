import { PLAN_ORDER, PLAN_LIMITS } from '@riscly/shared';
import { PageHeader, Card } from '@/components/ui';
import { ConnectProviders } from '@/components/ConnectProviders';

const PLANS = PLAN_ORDER.map((p) => {
  const l = PLAN_LIMITS[p];
  return {
    name: p[0].toUpperCase() + p.slice(1),
    price: l.priceEur === null ? 'Custom' : `${l.priceEur} €/mo`,
    features: [
      l.maxScansPerDay === Infinity ? 'Unlimited scans / day' : `${l.maxScansPerDay} scans / day`,
      l.aiTier === 'basic' ? 'Basis AI (Haiku)' : l.aiTier === 'sonnet' ? 'AI · Sonnet 4.6' : 'AI · Opus 4.8',
      l.reports ? 'PDF & Excel reports' : 'No report export',
      l.maxMembers === Infinity ? 'Unlimited members' : `${l.maxMembers} members`,
    ],
  };
});

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Connections, billing and organization." />
      <Card title="Connect providers" className="mb-4">
        <ConnectProviders />
      </Card>
      <Card title="Plan">
        <div className="grid grid-cols-4 gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-lg border border-border bg-panel2 p-4"
            >
              <div className="font-semibold text-white">{plan.name}</div>
              <div className="mt-1 text-sm text-muted">{plan.price}</div>
              <ul className="mt-3 space-y-1 text-xs text-slate-300">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
