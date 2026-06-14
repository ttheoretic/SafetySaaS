import { PLAN_ORDER, PLAN_LIMITS } from '@failsafe/shared';
import { PageHeader, Card } from '@/components/ui';

const PROVIDERS = [
  'GitHub', 'GitLab', 'Bitbucket', 'AWS', 'Azure', 'GCP',
  'Vercel', 'Railway', 'Render', 'Supabase', 'Neon', 'Stripe',
];

const PLANS = PLAN_ORDER.map((p) => {
  const l = PLAN_LIMITS[p];
  return {
    name: p[0].toUpperCase() + p.slice(1),
    price: l.priceEur === null ? 'Custom' : `${l.priceEur} €/mo`,
    features: [
      l.maxProjects === Infinity ? 'Unlimited projects' : `${l.maxProjects} project(s)`,
      l.aiPredictions ? 'AI predictions' : 'Heuristic predictions',
      l.pdfReports ? 'PDF reports' : 'No PDF export',
      l.maxMembers === Infinity ? 'Unlimited members' : `${l.maxMembers} members`,
    ],
  };
});

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Connections, billing and organization." />
      <Card title="Connect providers" className="mb-4">
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              className="rounded-md border border-border bg-panel2 px-3 py-1.5 text-sm hover:border-accent"
            >
              + {p}
            </button>
          ))}
        </div>
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
