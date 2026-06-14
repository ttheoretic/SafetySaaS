import { PageHeader, Card } from '@/components/ui';

const PROVIDERS = [
  'GitHub', 'GitLab', 'Bitbucket', 'AWS', 'Azure', 'GCP',
  'Vercel', 'Railway', 'Render', 'Supabase', 'Neon', 'Stripe',
];

const PLANS = [
  { name: 'Starter', price: '29 €/mo' },
  { name: 'Growth', price: '99 €/mo' },
  { name: 'Pro', price: '299 €/mo' },
  { name: 'Enterprise', price: 'Custom' },
];

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
              className="rounded-lg border border-border bg-panel2 p-4 text-center"
            >
              <div className="font-semibold text-white">{plan.name}</div>
              <div className="mt-1 text-sm text-muted">{plan.price}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
