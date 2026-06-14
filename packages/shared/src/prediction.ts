/**
 * AI Failure Prediction — deterministic heuristic layer.
 *
 * Surfaces likely *future* failure modes (bottlenecks, scaling cliffs,
 * architecture and security risks) from the scanned graph. These heuristics
 * run with no I/O and are always available; the AI layer in the API augments
 * them with an LLM and degrades gracefully to these when the LLM is absent.
 */

import { Severity } from './findings';
import { SystemGraph, SystemNode, indexNodes } from './model';
import { incomingEdges } from './model';
import { CRITICAL_THRESHOLD } from './graph';

export type PredictionCategory =
  | 'bottleneck'
  | 'scaling'
  | 'architecture'
  | 'security';

export interface Prediction {
  id: string;
  category: PredictionCategory;
  severity: Severity;
  title: string;
  /** When this is expected to bite, e.g. "at ~50,000 users". */
  horizon: string;
  likelihood: number; // 0..1
  rationale: string;
  recommendation: string;
  nodeId?: string;
  source: 'heuristic' | 'ai';
}

export interface PredictionContext {
  /** Current active users, if known — sharpens the horizon estimates. */
  currentUsers?: number;
}

/** Rough capacity ceilings (requests/min) before a tier needs scaling work. */
const SINGLE_DB_RPM_CEILING = 30_000;
const SINGLE_API_RPM_CEILING = 60_000;

export function predictFailures(
  graph: SystemGraph,
  ctx: PredictionContext = {},
): Prediction[] {
  const predictions: Prediction[] = [];
  const byId = indexNodes(graph);

  for (const node of graph.nodes) {
    const critical = isOnCriticalPath(graph, node, byId);

    // Database scaling cliff.
    if (node.kind === 'database' && !node.redundant && critical) {
      const horizon = usersHorizon(node, ctx, SINGLE_DB_RPM_CEILING);
      predictions.push({
        id: `pred-db-${node.id}`,
        category: 'bottleneck',
        severity: 'high',
        title: `${node.name} will become the primary bottleneck`,
        horizon,
        likelihood: 0.7,
        rationale:
          `${node.name} is a single, non-redundant database on the critical ` +
          `path. As load grows, connection limits and query latency saturate ` +
          `here first.`,
        recommendation:
          'Add read replicas + connection pooling now; plan partitioning/sharding before the horizon.',
        nodeId: node.id,
        source: 'heuristic',
      });
    }

    // API throughput ceiling.
    if (node.kind === 'api' && !node.redundant && critical) {
      predictions.push({
        id: `pred-api-${node.id}`,
        category: 'scaling',
        severity: 'medium',
        title: `${node.name} has a single-instance throughput ceiling`,
        horizon: usersHorizon(node, ctx, SINGLE_API_RPM_CEILING),
        likelihood: 0.6,
        rationale:
          `${node.name} runs as a single instance; vertical scaling runs out ` +
          `and there is no horizontal headroom.`,
        recommendation:
          'Make the API stateless and run ≥2 replicas behind a load balancer with autoscaling.',
        nodeId: node.id,
        source: 'heuristic',
      });
    }

    // Unmetered API → abuse / overload at scale.
    if (
      (node.kind === 'api' || node.kind === 'external_api') &&
      node.hasRateLimit === false
    ) {
      predictions.push({
        id: `pred-ratelimit-${node.id}`,
        category: 'security',
        severity: 'medium',
        title: `${node.name} will be abused or overloaded as it grows`,
        horizon: 'on the first traffic spike or abuse attempt',
        likelihood: 0.55,
        rationale:
          `${node.name} has no rate limiting; a single bad actor or viral ` +
          `peak can exhaust capacity.`,
        recommendation: 'Add per-key and per-IP rate limiting at the edge.',
        nodeId: node.id,
        source: 'heuristic',
      });
    }

    // Cache as a hidden dependency → thundering herd.
    if (node.kind === 'cache' && !node.redundant && critical) {
      predictions.push({
        id: `pred-cache-${node.id}`,
        category: 'architecture',
        severity: 'medium',
        title: `${node.name} failure will cause a thundering herd`,
        horizon: 'when the cache restarts under load',
        likelihood: 0.45,
        rationale:
          `${node.name} is a single cache on the critical path; a flush or ` +
          `restart sends full load straight to the origin/database.`,
        recommendation:
          'Run the cache clustered, add request coalescing and stale-while-revalidate.',
        nodeId: node.id,
        source: 'heuristic',
      });
    }

    // External provider with no fallback → cost / availability cliff.
    if (
      node.kind === 'external_api' &&
      critical &&
      (node.provider === 'stripe' || node.provider === 'openai')
    ) {
      predictions.push({
        id: `pred-vendor-${node.id}`,
        category: 'architecture',
        severity: 'low',
        title: `${node.name} is a scaling and availability cliff`,
        horizon: 'on a provider outage or pricing/quota change',
        likelihood: 0.4,
        rationale:
          `${node.name} (${node.provider}) is critically depended on with no ` +
          `documented fallback; its limits and pricing become yours.`,
        recommendation:
          'Abstract behind an interface, add a fallback path, and monitor quota usage.',
        nodeId: node.id,
        source: 'heuristic',
      });
    }
  }

  // No CDN in front of a frontend → origin saturation under viral peaks.
  const hasFrontend = graph.nodes.some((n) => n.kind === 'frontend');
  const hasCdn = graph.nodes.some((n) => n.kind === 'cdn');
  if (hasFrontend && !hasCdn) {
    predictions.push({
      id: 'pred-no-cdn',
      category: 'scaling',
      severity: 'low',
      title: 'No CDN — origin will saturate under a viral peak',
      horizon: 'during a viral / launch traffic spike',
      likelihood: 0.4,
      rationale:
        'Static and cacheable traffic hits the origin directly without an ' +
        'edge cache to absorb spikes.',
      recommendation: 'Put a CDN in front of the frontend and cache assets at the edge.',
      source: 'heuristic',
    });
  }

  return predictions.sort((a, b) => b.likelihood - a.likelihood);
}

function isOnCriticalPath(
  graph: SystemGraph,
  node: SystemNode,
  _byId: Map<string, SystemNode>,
): boolean {
  if (node.kind === 'api') return true;
  return incomingEdges(graph, node.id).some(
    (e) => (e.criticality ?? 1) >= CRITICAL_THRESHOLD,
  );
}

/**
 * Estimate the user count at which a tier hits its capacity ceiling, from the
 * node's observed requests/min and (optionally) the current user count.
 */
function usersHorizon(
  node: SystemNode,
  ctx: PredictionContext,
  rpmCeiling: number,
): string {
  const rpm = node.requestsPerMinute;
  if (!rpm || !ctx.currentUsers || ctx.currentUsers <= 0) {
    return 'as traffic grows';
  }
  const rpmPerUser = rpm / ctx.currentUsers;
  if (rpmPerUser <= 0) return 'as traffic grows';
  const usersAtCeiling = Math.round(rpmCeiling / rpmPerUser);
  return `at ~${usersAtCeiling.toLocaleString('en-US')} users`;
}
