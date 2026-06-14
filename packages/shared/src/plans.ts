/**
 * Subscription plans and their enforced limits. Pure config + helpers so the
 * API, the billing UI and tests all agree on what each tier allows.
 */

export type Plan = 'starter' | 'growth' | 'pro' | 'enterprise';

export interface PlanLimits {
  /** Monthly price in euros (null = custom). */
  priceEur: number | null;
  maxProjects: number; // Infinity for unlimited
  maxScansPerDay: number;
  /** Whether the AI (LLM) prediction layer is available. */
  aiPredictions: boolean;
  /** Whether PDF report export is available. */
  pdfReports: boolean;
  /** Maximum team members. */
  maxMembers: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: {
    priceEur: 29,
    maxProjects: 1,
    maxScansPerDay: 10,
    aiPredictions: false,
    pdfReports: false,
    maxMembers: 2,
  },
  growth: {
    priceEur: 99,
    maxProjects: 5,
    maxScansPerDay: 100,
    aiPredictions: true,
    pdfReports: true,
    maxMembers: 10,
  },
  pro: {
    priceEur: 299,
    maxProjects: 25,
    maxScansPerDay: 1000,
    aiPredictions: true,
    pdfReports: true,
    maxMembers: 50,
  },
  enterprise: {
    priceEur: null,
    maxProjects: Infinity,
    maxScansPerDay: Infinity,
    aiPredictions: true,
    pdfReports: true,
    maxMembers: Infinity,
  },
};

export const PLAN_ORDER: Plan[] = ['starter', 'growth', 'pro', 'enterprise'];

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function canCreateProject(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxProjects;
}

export function canAddMember(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxMembers;
}

export function hasFeature(plan: Plan, feature: 'aiPredictions' | 'pdfReports'): boolean {
  return PLAN_LIMITS[plan][feature];
}
