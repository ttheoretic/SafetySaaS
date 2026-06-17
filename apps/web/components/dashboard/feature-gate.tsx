'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { PLAN_LIMITS, PLAN_ORDER, type Feature, type Plan } from '@riscly/shared';
import { usePlan } from '@/lib/use-plan';

/** The lowest plan that unlocks a feature (for the upsell copy). */
function lowestPlanFor(feature: Feature): Plan {
  return PLAN_ORDER.find((p) => PLAN_LIMITS[p][feature]) ?? 'growth';
}

function planName(plan: Plan): string {
  return plan[0].toUpperCase() + plan.slice(1);
}

/**
 * Inline paywall. Renders children when the active plan unlocks `feature`,
 * otherwise an upgrade card. Stays locked while the plan is still loading so a
 * gated feature never flashes open.
 */
export function FeatureGate({
  feature,
  title,
  description,
  children,
}: {
  feature: Feature;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { has, loading } = usePlan();
  if (!loading && has(feature)) return <>{children}</>;

  const required = lowestPlanFor(feature);
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 p-10 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/15">
        <Lock className="size-5 text-primary" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        Available on the <span className="font-medium text-foreground">{planName(required)}</span>{' '}
        plan and above.
      </p>
      <Link
        href="/billing"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Sparkles className="size-4" /> Upgrade plan
      </Link>
    </div>
  );
}
