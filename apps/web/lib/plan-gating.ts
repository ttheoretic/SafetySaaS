import {
  PLAN_ORDER,
  PLAN_LIMITS,
  type Feature,
  type Plan,
  type PlanLimits,
} from '@riscly/shared'

/** A route's entitlement requirement: either a plan feature flag, or a minimum
 *  plan tier (used for capabilities that have no dedicated feature flag). */
export type GateReq = { feature?: Feature; minPlan?: Plan }

export type RouteGate = { prefix: string; req: GateReq; label: string }

/**
 * Which entitlement each plan-restricted route needs. Mirrors the pricing table:
 *   Starter  → architecture + risk triage only
 *   Growth   → + SAST / SCA / reports / PR export
 *   Pro      → + secrets / IaC / simulation / SSO / audit
 * Routes not listed here are available on every plan.
 */
export const ROUTE_GATES: RouteGate[] = [
  { prefix: '/security', req: { feature: 'sast' }, label: 'Security posture' },
  { prefix: '/code', req: { feature: 'sast' }, label: 'Code analysis (SAST)' },
  { prefix: '/attack-paths', req: { feature: 'sast' }, label: 'Attack paths' },
  { prefix: '/dependencies', req: { feature: 'sca' }, label: 'Dependency scanning' },
  { prefix: '/inventory/sbom', req: { feature: 'sca' }, label: 'Software bill of materials' },
  { prefix: '/secrets', req: { feature: 'secretScanning' }, label: 'Secret scanning' },
  { prefix: '/simulation', req: { feature: 'simulations' }, label: 'Failure simulation' },
  { prefix: '/compliance/reports', req: { feature: 'reports' }, label: 'Reports & export' },
  { prefix: '/compliance/frameworks', req: { feature: 'reports' }, label: 'Compliance frameworks' },
  { prefix: '/compliance/audit', req: { minPlan: 'pro' }, label: 'Audit log' },
]

export function planMeets(plan: Plan, min: Plan): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min)
}

/** Does this plan (with its limits) satisfy a requirement? */
export function meetsReq(plan: Plan, limits: PlanLimits, req: GateReq): boolean {
  if (req.feature) return Boolean(limits[req.feature])
  if (req.minPlan) return planMeets(plan, req.minPlan)
  return true
}

/** The cheapest plan that satisfies a requirement — the upgrade target shown in
 *  the paywall. */
export function minPlanForReq(req: GateReq): Plan {
  if (req.minPlan) return req.minPlan
  if (req.feature) {
    for (const p of PLAN_ORDER) if (PLAN_LIMITS[p][req.feature]) return p
  }
  return 'pro'
}

/** The gate that applies to a path (exact match or sub-path), longest wins. */
export function gateForPath(pathname: string): RouteGate | undefined {
  let best: RouteGate | undefined
  for (const g of ROUTE_GATES) {
    const match = pathname === g.prefix || pathname.startsWith(`${g.prefix}/`)
    if (match && (!best || g.prefix.length > best.prefix.length)) best = g
  }
  return best
}

const PLAN_NAME: Record<Plan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export function planName(plan: Plan): string {
  return PLAN_NAME[plan]
}
