/**
 * Revenue Impact Engine.
 *
 * Translates a simulation result + business context into euros: direct
 * downtime revenue loss, lost conversions, churn risk and SLA credits.
 */

import { BusinessContext } from './model';
import { SimulationResult } from './simulation';

export interface RevenueImpactResult {
  currency: string;
  durationHours: number;
  /** Direct revenue not earned during the impacted window. */
  directLoss: number;
  /** Estimated lost checkout conversions (payments-specific scenarios). */
  conversionLoss: number;
  conversionLossPct: number;
  /** SLA credits owed for the breach window. */
  slaCredits: number;
  /** Estimated incremental churn cost over the following month. */
  churnRiskCost: number;
  /** Total quantified business impact. */
  totalImpact: number;
}

/** Fraction of full revenue still flowing given an impact level. */
const IMPACT_REVENUE_FACTOR = {
  none: 0,
  degraded: 0.25,
  partial_outage: 0.6,
  full_outage: 1,
} as const;

export function revenueImpact(
  sim: SimulationResult,
  biz: BusinessContext,
  durationHours = 1,
): RevenueImpactResult {
  const currency = biz.currency ?? 'EUR';
  const hourlyRevenue = biz.monthlyRevenue / (30 * 24);

  // Direct loss scales with how much of the system (and which entrypoints) is
  // down — full outage loses all revenue for the window, degraded loses a
  // quarter, scaled further by blast radius for partial cases.
  const impactFactor = IMPACT_REVENUE_FACTOR[sim.impact];
  const radiusFactor =
    sim.impact === 'partial_outage'
      ? Math.max(0.3, sim.blastRadius)
      : impactFactor;
  const directLoss = round(hourlyRevenue * durationHours * radiusFactor);

  // Payments-specific scenarios additionally lose conversions: checkout is
  // blocked even if the rest of the app is up.
  const paymentsScenario =
    sim.type === 'stripe_down' || sim.type === 'payment_failure';
  const checkoutShare = biz.peakCheckoutShare ?? 0.15;
  const conversionLoss = paymentsScenario
    ? round(hourlyRevenue * durationHours * checkoutShare * 4) // peak weighting
    : 0;
  const conversionLossPct = paymentsScenario
    ? Math.round(checkoutShare * 100)
    : 0;

  // SLA credits: a fraction of the monthly bill refunded per breach hour, only
  // when entrypoints are actually down.
  const slaRate = biz.slaCreditRatePerHour ?? 0;
  const slaCredits =
    sim.fullOutage || sim.impact === 'partial_outage'
      ? round(biz.monthlyRevenue * slaRate * durationHours)
      : 0;

  // Churn risk: outages and business shocks raise cancellations. Model as a
  // small fraction of MRR proportional to severity.
  const churnFactor = churnFactorFor(sim);
  const churnRiskCost = round(biz.monthlyRevenue * churnFactor);

  const totalImpact = round(
    directLoss + conversionLoss + slaCredits + churnRiskCost,
  );

  return {
    currency,
    durationHours,
    directLoss,
    conversionLoss,
    conversionLossPct,
    slaCredits,
    churnRiskCost,
    totalImpact,
  };
}

function churnFactorFor(sim: SimulationResult): number {
  if (sim.type === 'churn_wave') return 0.08;
  if (sim.type === 'refund_spike') return 0.03;
  switch (sim.impact) {
    case 'full_outage':
      return 0.02;
    case 'partial_outage':
      return 0.01;
    case 'degraded':
      return 0.003;
    default:
      return 0;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
