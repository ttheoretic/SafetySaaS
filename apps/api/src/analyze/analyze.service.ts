import { Injectable } from '@nestjs/common';
import {
  reliabilityScore,
  simulateFailure,
  revenueImpact,
  securitySimulation,
  buildRecommendations,
  SystemGraph,
  SimulationType,
  SimulationParams,
  BusinessContext,
} from '@riscly/shared';

/**
 * Stateless orchestration over the pure engines in @riscly/shared.
 * No I/O — safe to call from controllers and workers alike.
 */
@Injectable()
export class AnalyzeService {
  reliability(graph: SystemGraph) {
    const reliability = reliabilityScore(graph);
    const recommendations = buildRecommendations(reliability.findings);
    return { ...reliability, recommendations };
  }

  security(graph: SystemGraph) {
    const security = securitySimulation(graph);
    const recommendations = buildRecommendations(security.findings);
    return { ...security, recommendations };
  }

  simulate(
    graph: SystemGraph,
    type: SimulationType,
    params: SimulationParams = {},
    business?: BusinessContext,
    durationHours = 1,
  ) {
    const result = simulateFailure(graph, type, params);
    const revenue = business
      ? revenueImpact(result, business, durationHours)
      : undefined;
    return { result, revenue };
  }

  /** A full analysis pass: reliability + security + a default scenario sweep. */
  fullReport(graph: SystemGraph, business?: BusinessContext) {
    const reliability = this.reliability(graph);
    const security = this.security(graph);
    const scenarios: SimulationType[] = [
      'dns', 'db_lock', 'infra_region', 'stripe_down', 'traffic_100x',
    ];
    const simulations = scenarios.map((type) =>
      this.simulate(graph, type, {}, business, 1),
    );
    return { reliability, security, simulations };
  }
}
