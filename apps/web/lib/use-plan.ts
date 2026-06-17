'use client';

import { useQuery } from '@tanstack/react-query';
import { PLAN_LIMITS, type Feature, type Plan, type PlanLimits } from '@riscly/shared';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';

export interface PlanInfo {
  plan: Plan;
  limits: PlanLimits;
  usage: { projects: number; members: number };
  /** Whether the org's plan unlocks a feature. */
  has: (feature: Feature) => boolean;
  loading: boolean;
}

/**
 * Resolves the active org's plan + limits from the billing summary, with a
 * `has(feature)` helper for UI gating. Falls back to the starter plan while
 * loading or signed-out so gated UI stays hidden rather than flashing open.
 */
export function usePlan(): PlanInfo {
  const { token, hydrated } = useAuth();
  const q = useQuery({
    queryKey: ['billing'],
    queryFn: api.billing,
    enabled: Boolean(token) && hydrated,
    staleTime: 60_000,
  });

  const plan = (q.data?.plan ?? 'starter') as Plan;
  const limits = q.data?.limits ?? PLAN_LIMITS[plan];
  const usage = q.data?.usage ?? { projects: 0, members: 0 };

  return {
    plan,
    limits,
    usage,
    has: (feature: Feature) => Boolean(limits[feature]),
    loading: q.isLoading,
  };
}
