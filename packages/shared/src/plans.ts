/**
 * Subscription plans and their enforced limits. Pure config + helpers so the
 * API, the billing UI and tests all agree on what each tier allows.
 *
 * Projects are deliberately NOT a tier lever — a paid subscription covers one
 * project, and a second project means a second subscription. Tiers differ on
 * scans/day, the AI model that powers predictions, and which features
 * (Live View, Scenario Lab, Reports, Revenue Impact) are unlocked.
 */

export type Plan = 'starter' | 'growth' | 'pro' | 'enterprise';

/** Which Claude model powers AI predictions for a tier. */
export type AiTier = 'basic' | 'sonnet' | 'opus';

/** How often automated monitoring re-scans the architecture. */
export type MonitoringTier = 'daily' | 'hourly' | 'continuous';

/** Alerting destinations available per tier. */
export type AlertsTier = 'email' | 'slack' | 'slack_teams' | 'custom';

/** Feature flags that can be gated per plan. */
export type Feature =
  | 'aiPredictions'
  | 'simulations'
  | 'scenarioLab'
  | 'reports'
  | 'revenueImpact';

export interface PlanLimits {
  /** Monthly price in euros (null = custom). */
  priceEur: number | null;
  /** Projects per subscription. One for everyone except enterprise. */
  maxProjects: number; // Infinity for unlimited
  /** Hard cap on scans started per UTC day. */
  maxScansPerDay: number; // Infinity for unlimited
  /** AI model tier used for failure prediction. */
  aiTier: AiTier;
  /** Automated monitoring cadence. */
  monitoring: MonitoringTier;
  /** Alerting destinations. */
  alerts: AlertsTier;
  /** How long scan history is retained, in days (Infinity = unlimited). */
  historyDays: number;
  /** Whether the AI (LLM) prediction layer is available. */
  aiPredictions: boolean;
  /** Failure simulations (the core deterministic engine). */
  simulations: boolean;
  /** The Scenario Lab (compose & save multi-step failure scenarios). */
  scenarioLab: boolean;
  /** Exportable reports (PDF / Excel). */
  reports: boolean;
  /** Revenue / business-impact scoring. */
  revenueImpact: boolean;
  /** Maximum team members. */
  maxMembers: number;
}

/** Logical AI tier → concrete Claude model id. */
export const AI_MODELS: Record<AiTier, string> = {
  basic: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-8',
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: {
    priceEur: 29,
    maxProjects: 1,
    maxScansPerDay: 5,
    aiTier: 'basic',
    monitoring: 'daily',
    alerts: 'email',
    historyDays: 30,
    aiPredictions: true,
    simulations: true,
    scenarioLab: false,
    reports: false,
    revenueImpact: false,
    maxMembers: 2,
  },
  growth: {
    priceEur: 99,
    maxProjects: 1,
    maxScansPerDay: 50,
    aiTier: 'sonnet',
    monitoring: 'hourly',
    alerts: 'slack',
    historyDays: 365,
    aiPredictions: true,
    simulations: true,
    scenarioLab: true,
    reports: true,
    revenueImpact: true,
    maxMembers: 10,
  },
  pro: {
    priceEur: 399,
    maxProjects: 1,
    maxScansPerDay: 500,
    aiTier: 'opus',
    monitoring: 'continuous',
    alerts: 'slack_teams',
    historyDays: Infinity,
    aiPredictions: true,
    simulations: true,
    scenarioLab: true,
    reports: true,
    revenueImpact: true,
    maxMembers: 50,
  },
  enterprise: {
    priceEur: null,
    maxProjects: Infinity,
    maxScansPerDay: Infinity,
    aiTier: 'opus',
    monitoring: 'continuous',
    alerts: 'custom',
    historyDays: Infinity,
    aiPredictions: true,
    simulations: true,
    scenarioLab: true,
    reports: true,
    revenueImpact: true,
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

/** Whether another scan may be started today given how many already ran. */
export function canScanToday(plan: Plan, scansToday: number): boolean {
  return scansToday < PLAN_LIMITS[plan].maxScansPerDay;
}

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_LIMITS[plan][feature];
}

/** The Claude model that powers AI prediction for a plan. */
export function aiModelForPlan(plan: Plan): string {
  return AI_MODELS[PLAN_LIMITS[plan].aiTier];
}

/** The AI tier (basic/sonnet/opus) for a plan. */
export function aiTierForPlan(plan: Plan): AiTier {
  return PLAN_LIMITS[plan].aiTier;
}

// --- Human-readable labels (shared by every pricing surface) -----------------

export const AI_TIER_LABEL: Record<AiTier, string> = {
  basic: 'Haiku',
  sonnet: 'Sonnet',
  opus: 'Opus',
};

/** AI tier label including the concrete Claude version. */
export const AI_TIER_LABEL_LONG: Record<AiTier, string> = {
  basic: 'Basis AI · Haiku 4.5',
  sonnet: 'Claude Sonnet 4.6',
  opus: 'Claude Opus 4.8',
};

export const MONITORING_LABEL: Record<MonitoringTier, string> = {
  daily: 'Daily',
  hourly: 'Hourly',
  continuous: 'Continuous',
};

export const ALERTS_LABEL: Record<AlertsTier, string> = {
  email: 'Email',
  slack: 'Slack',
  slack_teams: 'Slack + Teams',
  custom: 'Custom',
};

/** History-retention label, e.g. "30d", "1y", "Unlimited". */
export function historyLabel(days: number): string {
  if (!Number.isFinite(days)) return 'Unlimited';
  if (days % 365 === 0) return `${days / 365}y`;
  return `${days}d`;
}
