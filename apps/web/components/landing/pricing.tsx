import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLAN_ORDER, PLAN_LIMITS } from '@riscly/shared';
import { cn } from '@/lib/utils';

const DESCRIPTIONS: Record<string, string> = {
  starter: 'For side projects and early-stage teams.',
  growth: 'For scaling SaaS teams that can’t go down.',
  pro: 'For platforms with real revenue on the line.',
  enterprise: 'For mission-critical platforms at scale.',
};
const AI_LABEL: Record<string, string> = {
  basic: 'Basis AI (Haiku 4.5)',
  sonnet: 'AI prediction · Claude Sonnet 4.6',
  opus: 'AI prediction · Claude Opus 4.8',
};
const EXTRAS: Record<string, string[]> = {
  starter: ['Reliability & security score', 'Failure simulations', 'Community support'],
  growth: ['Live View monitoring', 'Scenario Lab', 'Revenue impact scoring', 'PDF & Excel reports', 'Priority support'],
  pro: ['Everything in Growth', 'Predictive alerts', 'Audit logs', 'SSO & RBAC'],
  enterprise: ['Unlimited scans & projects', 'Custom failure models', 'Dedicated reliability engineer', 'SLA & onboarding'],
};

export function Pricing() {
  const tiers = PLAN_ORDER.map((plan) => {
    const l = PLAN_LIMITS[plan];
    return {
      plan,
      name: plan[0].toUpperCase() + plan.slice(1),
      price: l.priceEur === null ? 'Custom' : `€${l.priceEur}`,
      period: l.priceEur === null ? '' : '/mo',
      featured: plan === 'growth',
      cta: plan === 'enterprise' ? 'Contact sales' : plan === 'growth' ? 'Analyze My Architecture' : 'Start free',
      features: [
        l.maxScansPerDay === Infinity ? 'Unlimited scans / day' : `${l.maxScansPerDay} scans / day`,
        AI_LABEL[l.aiTier],
        l.maxMembers === Infinity ? 'Unlimited members' : `${l.maxMembers} team members`,
        ...EXTRAS[plan],
      ],
    };
  });

  return (
    <section id="pricing" className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Simple pricing that scales with your risk.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div key={t.name} className={cn('flex flex-col rounded-2xl border bg-card p-7', t.featured ? 'border-primary shadow-lg shadow-primary/10' : 'border-border/60')}>
              {t.featured && (
                <span className="mb-4 w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Most popular</span>
              )}
              <h3 className="text-lg font-medium text-foreground">{t.name}</h3>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-mono text-4xl font-semibold tracking-tight text-foreground">{t.price}</span>
                <span className="mb-1 text-sm text-muted-foreground">{t.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{DESCRIPTIONS[t.plan]}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="size-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/login?mode=signup"
                className={cn(
                  'mt-7 w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium',
                  t.featured ? 'bg-primary text-primary-foreground hover:opacity-90' : 'border border-border text-foreground hover:bg-secondary/50',
                )}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
