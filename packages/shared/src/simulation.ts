/**
 * Failure Simulation Engine.
 *
 * Given a system graph and a scenario, computes the blast radius and a
 * qualitative impact for infrastructure outages, external-service outages,
 * traffic surges and business shocks. Deterministic and pure.
 */

import { SystemGraph, SystemNode, ProviderId, indexNodes } from './model';
import { failureImpact, entrypoints } from './graph';

export type SimulationType =
  | 'infra_server'
  | 'infra_region'
  | 'dns'
  | 'db_lock'
  | 'cache'
  | 'queue'
  | 'stripe_down'
  | 'openai_down'
  | 'aws_down'
  | 'cloudflare_down'
  | 'traffic_10x'
  | 'traffic_100x'
  | 'viral_peak'
  | 'churn_wave'
  | 'payment_failure'
  | 'refund_spike';

export interface SimulationParams {
  /** For infra_server / db_lock / cache / queue: the node to knock out. */
  nodeId?: string;
  /** For infra_region: which region to fail. */
  region?: string;
  /** For traffic scenarios: multiplier override. */
  multiplier?: number;
  /** Outage duration in hours (used by the revenue engine downstream). */
  durationHours?: number;
}

export type Impact = 'none' | 'degraded' | 'partial_outage' | 'full_outage';

export interface SimulationResult {
  type: SimulationType;
  impact: Impact;
  /** Node ids that become unavailable / unreachable. */
  affectedNodeIds: string[];
  /** Fraction of the system rendered unreachable, 0..1. */
  blastRadius: number;
  /** Whether all entrypoints are down. */
  fullOutage: boolean;
  narrative: string;
  /** Concrete mitigations surfaced for this scenario. */
  mitigations: string[];
}

const PROVIDER_DOWN: Partial<Record<SimulationType, ProviderId>> = {
  stripe_down: 'stripe',
  openai_down: 'openai',
  aws_down: 'aws',
  cloudflare_down: 'cloudflare',
};

export function simulateFailure(
  graph: SystemGraph,
  type: SimulationType,
  params: SimulationParams = {},
): SimulationResult {
  switch (type) {
    case 'infra_server':
    case 'db_lock':
    case 'cache':
    case 'queue':
      return nodeOutage(graph, type, params);
    case 'infra_region':
      return regionOutage(graph, params);
    case 'dns':
      return dnsOutage(graph);
    case 'stripe_down':
    case 'openai_down':
    case 'aws_down':
    case 'cloudflare_down':
      return providerOutage(graph, type);
    case 'traffic_10x':
    case 'traffic_100x':
    case 'viral_peak':
      return trafficSurge(graph, type, params);
    case 'churn_wave':
    case 'payment_failure':
    case 'refund_spike':
      return businessShock(type);
    default:
      return {
        type,
        impact: 'none',
        affectedNodeIds: [],
        blastRadius: 0,
        fullOutage: false,
        narrative: 'Unknown scenario.',
        mitigations: [],
      };
  }
}

function blastFromRemoved(graph: SystemGraph, removed: Set<string>) {
  const roots = entrypoints(graph);
  const impacted = failureImpact(graph, removed);
  const affected = [...impacted];
  const blastRadius =
    graph.nodes.length === 0 ? 0 : affected.length / graph.nodes.length;
  const fullOutage = roots.length > 0 && roots.every((r) => impacted.has(r));
  return { affected, blastRadius, fullOutage };
}

function classify(blastRadius: number, fullOutage: boolean): Impact {
  if (fullOutage) return 'full_outage';
  if (blastRadius >= 0.5) return 'partial_outage';
  if (blastRadius > 0) return 'degraded';
  return 'none';
}

function nodeOutage(
  graph: SystemGraph,
  type: SimulationType,
  params: SimulationParams,
): SimulationResult {
  const byId = indexNodes(graph);
  const target = params.nodeId
    ? byId.get(params.nodeId)
    : defaultTargetFor(graph, type);

  if (!target) {
    return empty(type, 'No matching component found to fail.');
  }
  const { affected, blastRadius, fullOutage } = blastFromRemoved(
    graph,
    new Set([target.id]),
  );
  return {
    type,
    impact: classify(blastRadius, fullOutage),
    affectedNodeIds: affected,
    blastRadius,
    fullOutage,
    narrative:
      `${target.name} (${target.kind}) fails. ${affected.length} component(s) ` +
      `become unreachable (${Math.round(blastRadius * 100)}% of the system).` +
      (target.redundant
        ? ' Redundancy is configured, so traffic can shift to replicas.'
        : ' No redundancy — failover is not possible.'),
    mitigations: target.redundant
      ? ['Verify automatic failover and replica lag thresholds.']
      : redundancyMitigations(target),
  };
}

function defaultTargetFor(
  graph: SystemGraph,
  type: SimulationType,
): SystemNode | undefined {
  const kind =
    type === 'db_lock'
      ? 'database'
      : type === 'cache'
        ? 'cache'
        : type === 'queue'
          ? 'queue'
          : undefined;
  if (kind) return graph.nodes.find((n) => n.kind === kind);
  // infra_server: most-depended-on service.
  const incoming = new Map<string, number>();
  for (const e of graph.edges)
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
  return [...graph.nodes]
    .filter((n) => n.kind === 'service' || n.kind === 'api')
    .sort((a, b) => (incoming.get(b.id) ?? 0) - (incoming.get(a.id) ?? 0))[0];
}

function regionOutage(
  graph: SystemGraph,
  params: SimulationParams,
): SimulationResult {
  const region =
    params.region ?? graph.nodes.find((n) => n.region)?.region;
  const removed = new Set(
    graph.nodes.filter((n) => n.region === region).map((n) => n.id),
  );
  if (!removed.size) {
    return empty('infra_region', `No components found in region ${region}.`);
  }
  const { affected, blastRadius, fullOutage } = blastFromRemoved(graph, removed);
  return {
    type: 'infra_region',
    impact: classify(blastRadius, fullOutage),
    affectedNodeIds: affected,
    blastRadius,
    fullOutage,
    narrative:
      `Region ${region} fails, taking down ${removed.size} component(s). ` +
      `${Math.round(blastRadius * 100)}% of the system is affected.`,
    mitigations: [
      'Deploy across at least two regions for stateless services.',
      'Use cross-region replication for stateful stores.',
      'Add health-check based DNS/global load-balancer failover.',
    ],
  };
}

function dnsOutage(graph: SystemGraph): SimulationResult {
  const roots = entrypoints(graph);
  return {
    type: 'dns',
    impact: 'full_outage',
    affectedNodeIds: roots,
    blastRadius: 1,
    fullOutage: true,
    narrative:
      'DNS resolution fails. Every entrypoint becomes unreachable to users ' +
      'regardless of backend health — a total outage.',
    mitigations: [
      'Use multiple DNS providers (secondary DNS).',
      'Raise TTLs cautiously and pre-provision failover records.',
    ],
  };
}

function providerOutage(
  graph: SystemGraph,
  type: SimulationType,
): SimulationResult {
  const provider = PROVIDER_DOWN[type]!;
  const removed = new Set(
    graph.nodes.filter((n) => n.provider === provider).map((n) => n.id),
  );
  if (!removed.size) {
    return {
      type,
      impact: 'none',
      affectedNodeIds: [],
      blastRadius: 0,
      fullOutage: false,
      narrative: `No dependency on ${provider} detected — not exposed.`,
      mitigations: [],
    };
  }
  const { affected, blastRadius, fullOutage } = blastFromRemoved(graph, removed);
  const isPayments = provider === 'stripe';
  return {
    type,
    impact: isPayments ? 'partial_outage' : classify(blastRadius, fullOutage),
    affectedNodeIds: affected.length ? affected : [...removed],
    blastRadius: Math.max(blastRadius, removed.size / graph.nodes.length),
    fullOutage,
    narrative:
      `${provider} is unavailable. ${[...removed].length} integration ` +
      `point(s) fail` +
      (isPayments
        ? '; checkout and billing stop, blocking new revenue.'
        : '; dependent features degrade.'),
    mitigations: providerMitigations(provider),
  };
}

function trafficSurge(
  graph: SystemGraph,
  type: SimulationType,
  params: SimulationParams,
): SimulationResult {
  const multiplier =
    params.multiplier ??
    (type === 'traffic_10x' ? 10 : type === 'traffic_100x' ? 100 : 25);

  // Bottlenecks: non-redundant stateful nodes and rate-limit-less APIs are the
  // first to buckle under load.
  const bottlenecks = graph.nodes.filter(
    (n) =>
      (n.kind === 'database' && !n.redundant) ||
      (n.kind === 'cache' && !n.redundant) ||
      ((n.kind === 'api' || n.kind === 'external_api') &&
        n.hasRateLimit === false),
  );
  const blastRadius = Math.min(
    1,
    bottlenecks.length / Math.max(1, graph.nodes.length),
  );
  const fullOutage = bottlenecks.some((n) => n.kind === 'database') && multiplier >= 100;
  return {
    type,
    impact: fullOutage
      ? 'full_outage'
      : bottlenecks.length
        ? 'partial_outage'
        : 'degraded',
    affectedNodeIds: bottlenecks.map((n) => n.id),
    blastRadius,
    fullOutage,
    narrative:
      `Traffic increases ${multiplier}x. ${bottlenecks.length} component(s) ` +
      `become bottlenecks` +
      (bottlenecks.some((n) => n.kind === 'database')
        ? '; the primary database saturates connections and query latency ' +
          'spikes first.'
        : '; stateless tiers scale but downstream limits bind.'),
    mitigations: [
      'Add read replicas and connection pooling for databases.',
      'Introduce autoscaling with realistic max replica counts.',
      'Add caching and rate limiting at the edge to shed load.',
    ],
  };
}

function businessShock(type: SimulationType): SimulationResult {
  const narratives: Record<string, string> = {
    churn_wave:
      'A churn wave hits: a spike in cancellations compresses MRR and future ' +
      'revenue. Operationally stable but financially material.',
    payment_failure:
      'A surge of failed payments (card declines / dunning) interrupts ' +
      'collection; involuntary churn rises if retries are weak.',
    refund_spike:
      'A refund spike reverses recognized revenue and can trip processor ' +
      'risk thresholds, threatening the payment account itself.',
  };
  return {
    type,
    impact: 'degraded',
    affectedNodeIds: [],
    blastRadius: 0,
    fullOutage: false,
    narrative: narratives[type] ?? 'Business shock.',
    mitigations: [
      'Implement smart dunning and retry schedules.',
      'Add proactive churn detection and save-flows.',
      'Monitor refund/chargeback ratios against processor thresholds.',
    ],
  };
}

function redundancyMitigations(node: SystemNode): string[] {
  if (node.kind === 'database')
    return [
      'Add a read replica and configure automatic failover.',
      'Enable point-in-time recovery / backups.',
    ];
  if (node.kind === 'cache')
    return ['Run the cache in a replicated/clustered mode.'];
  if (node.kind === 'queue')
    return ['Use a clustered/mirrored queue with persistence.'];
  return ['Run at least two instances behind a load balancer.'];
}

function providerMitigations(provider: ProviderId): string[] {
  switch (provider) {
    case 'stripe':
      return [
        'Queue and retry charges; show a graceful "try again" UX.',
        'Evaluate a secondary payment processor for failover.',
      ];
    case 'openai':
      return [
        'Add a fallback model/provider (e.g. Anthropic) behind an abstraction.',
        'Cache and degrade gracefully when the LLM is unavailable.',
      ];
    case 'aws':
      return ['Multi-region / multi-AZ deployment for critical paths.'];
    case 'cloudflare':
      return ['Have an origin-direct failover path and secondary CDN.'];
    default:
      return ['Add a documented fallback for this dependency.'];
  }
}

function empty(type: SimulationType, narrative: string): SimulationResult {
  return {
    type,
    impact: 'none',
    affectedNodeIds: [],
    blastRadius: 0,
    fullOutage: false,
    narrative,
    mitigations: [],
  };
}
