/**
 * Scenario Laboratory — compose multiple simulations into one "what-if"
 * experiment and aggregate their impact. Pure and deterministic.
 *
 * Example questions this expresses:
 *   "What if AWS us-east-1 fails AND we get 100x traffic?"
 *   "What if Stripe is down for 24 hours during a churn wave?"
 */

import { SystemGraph, BusinessContext } from './model';
import {
  simulateFailure,
  Impact,
  SimulationType,
  SimulationParams,
  SimulationResult,
} from './simulation';
import { revenueImpact, RevenueImpactResult } from './revenue';

export interface ScenarioStep {
  type: SimulationType;
  params?: SimulationParams;
  durationHours?: number;
}

export interface ScenarioDefinition {
  steps: ScenarioStep[];
}

export interface ScenarioStepResult {
  step: ScenarioStep;
  result: SimulationResult;
  revenue?: RevenueImpactResult;
}

export interface ScenarioResult {
  steps: ScenarioStepResult[];
  /** The most severe impact across all steps. */
  worstImpact: Impact;
  /** Union of every component affected across the steps. */
  affectedNodeIds: string[];
  /** Sum of the quantified business impact across steps. */
  totalRevenueImpact: number;
  currency: string;
}

const IMPACT_RANK: Record<Impact, number> = {
  none: 0,
  degraded: 1,
  partial_outage: 2,
  full_outage: 3,
};

export function runScenario(
  graph: SystemGraph,
  definition: ScenarioDefinition,
  business?: BusinessContext,
): ScenarioResult {
  const steps: ScenarioStepResult[] = definition.steps.map((step) => {
    const result = simulateFailure(graph, step.type, step.params ?? {});
    const revenue = business
      ? revenueImpact(result, business, step.durationHours ?? 1)
      : undefined;
    return { step, result, revenue };
  });

  const worstImpact = steps.reduce<Impact>(
    (worst, s) =>
      IMPACT_RANK[s.result.impact] > IMPACT_RANK[worst] ? s.result.impact : worst,
    'none',
  );

  const affectedNodeIds = [
    ...new Set(steps.flatMap((s) => s.result.affectedNodeIds)),
  ];

  const totalRevenueImpact = round(
    steps.reduce((sum, s) => sum + (s.revenue?.totalImpact ?? 0), 0),
  );

  return {
    steps,
    worstImpact,
    affectedNodeIds,
    totalRevenueImpact,
    currency: business?.currency ?? 'EUR',
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
