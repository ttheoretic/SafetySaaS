/**
 * Subscription plans and their enforced limits. Pure config + helpers so the
 * API, the billing UI and tests all agree on what each tier allows.
 *
 * The canonical, customer-facing source of truth is the pricing comparison
 * table (apps/web pricing page). These limits mirror that table so entitlements
 * match what customers are sold:
 *   - Starter  $29  · Haiku  · architecture + risk triage only
 *   - Growth   $99  · Sonnet · + SAST/SCA + code quality + AI PR export (most popular)
 *   - Pro      $199 · Opus   · + secrets/IaC + failure simulation + SSO
 *   - Enterprise     · Opus+ · everything, custom
 *
 * A paid subscription covers one project; a second project means a second
 * subscription. Repositories per project scale with the tier (maxRepos).
 */

export type Plan = 'starter' | 'growth' | 'pro' | 'enterprise';

/** Which Claude model powers AI predictions for a tier. */
export type AiTier = 'basic' | 'sonnet' | 'opus';

/** How often automated monitoring re-scans the architecture. */
export type MonitoringTier = 'weekly' | 'daily' | 'hourly' | 'continuous';

/** Alerting destinations available per tier. */
export type AlertsTier = 'email' | 'slack' | 'slack_teams' | 'custom';

/** Feature flags that can be gated per plan. */
export type Feature =
  | 'aiPredictions'
  | 'simulations'
  | 'scenarioLab'
  | 'reports'
  | 'revenueImpact'
  | 'sast'
  | 'sca'
  | 'codeQuality'
  | 'secretScanning'
  | 'iac'
  | 'prExport'
  | 'sso';

export interface PlanLimits {
  /** Monthly price (null = custom). Currency is USD, matching the pricing table. */
  priceEur: number | null;
  /** Projects per subscription. One for everyone except enterprise. */
  maxProjects: number; // Infinity for unlimited
  /** Repositories that can be connected/scanned per project. */
  maxRepos: number; // Infinity for unlimited
  /** Hard cap on scans started per UTC day. */
  maxScansPerDay: number; // Infinity for unlimited
  /** AI model tier used for failure prediction. */
  aiTier: AiTier;
  /** Monthly AI fix-suggestion quota. */
  aiFixesPerMonth: number; // Infinity for unlimited
  /** Automated monitoring cadence. */
  monitoring: MonitoringTier;
  /** Alerting destinations. */
  alerts: AlertsTier;
  /** How long scan history is retained, in days (Infinity = unlimited). */
  historyDays: number;
  /** Whether the AI (LLM) prediction/assistant layer is available. */
  aiPredictions: boolean;
  /** Failure simulations (the core deterministic engine). */
  simulations: boolean;
  /** The Scenario Lab (compose & save multi-step failure scenarios). */
  scenarioLab: boolean;
  /** Exportable reports (PDF / Excel). */
  reports: boolean;
  /** Revenue / business-impact scoring. */
  revenueImpact: boolean;
  /** Static application security testing (code analysis). */
  sast: boolean;
  /** Software composition analysis (dependency scanning). */
  sca: boolean;
  /** Code-quality / maintainability hotspots (future-problem signals). */
  codeQuality: boolean;
  /** Secret scanning. */
  secretScanning: boolean;
  /** Infrastructure-as-Code scanning. */
  iac: boolean;
  /** One-click AI fix / remediation PR export. */
  prExport: boolean;
  /** SSO / SAML. */
  sso: boolean;
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
    maxRepos: 1,
    maxScansPerDay: 2,
    aiTier: 'basic',
    aiFixesPerMonth: 25,
    monitoring: 'weekly',
    alerts: 'email',
    historyDays: 7,
    aiPredictions: true,
    simulations: false,
    scenarioLab: false,
    reports: false,
    revenueImpact: false,
    sast: false,
    sca: false,
    codeQuality: false,
    secretScanning: false,
    iac: false,
    prExport: false,
    sso: false,
    maxMembers: 1,
  },
  growth: {
    priceEur: 99,
    maxProjects: 10,
    maxRepos: 1,
    maxScansPerDay: 10,
    aiTier: 'sonnet',
    aiFixesPerMonth: 500,
    monitoring: 'daily',
    alerts: 'slack',
    historyDays: 90,
    aiPredictions: true,
    simulations: false,
    scenarioLab: false,
    reports: true,
    revenueImpact: true,
    sast: true,
    sca: true,
    codeQuality: true,
    secretScanning: false,
    iac: false,
    prExport: true,
    sso: false,
    maxMembers: 15,
  },
  pro: {
    priceEur: 199,
    maxProjects: Infinity,
    maxRepos: 1,
    maxScansPerDay: Infinity,
    aiTier: 'opus',
    aiFixesPerMonth: Infinity,
    monitoring: 'continuous',
    alerts: 'slack_teams',
    historyDays: 365,
    aiPredictions: true,
    simulations: true,
    scenarioLab: true,
    reports: true,
    revenueImpact: true,
    sast: true,
    sca: true,
    codeQuality: true,
    secretScanning: true,
    iac: true,
    prExport: true,
    sso: true,
    maxMembers: 100,
  },
  enterprise: {
    priceEur: null,
    maxProjects: Infinity,
    maxRepos: 1,
    maxScansPerDay: Infinity,
    aiTier: 'opus',
    aiFixesPerMonth: Infinity,
    monitoring: 'continuous',
    alerts: 'custom',
    historyDays: Infinity,
    aiPredictions: true,
    simulations: true,
    scenarioLab: true,
    reports: true,
    revenueImpact: true,
    sast: true,
    sca: true,
    codeQuality: true,
    secretScanning: true,
    iac: true,
    prExport: true,
    sso: true,
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

/** Whether another repo may be connected given how many are already connected. */
export function canAddRepo(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxRepos;
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

/** AI tier label including the concrete Claude model, matching the table. */
export const AI_TIER_LABEL_LONG: Record<AiTier, string> = {
  basic: 'Claude Haiku',
  sonnet: 'Claude Sonnet',
  opus: 'Claude Opus',
};

export const MONITORING_LABEL: Record<MonitoringTier, string> = {
  weekly: 'Weekly',
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
