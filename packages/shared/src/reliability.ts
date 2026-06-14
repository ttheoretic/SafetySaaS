/**
 * Reliability Score Engine.
 *
 * Produces a deterministic score 0–100 plus the findings that explain it.
 * The score starts at 100 and subtracts weighted penalties for each risk,
 * floored at 0. Findings are the source of truth — the score is just their
 * aggregation — so reports can always trace a number back to its causes.
 */

import { Finding, severityFromWeight } from './findings';
import { SystemGraph, SystemNode } from './model';
import { singlePointsOfFailure } from './graph';

export interface ReliabilityResult {
  score: number; // 0..100
  findings: Finding[];
  summary: {
    spofCount: number;
    databasesWithoutBackup: number;
    apisWithoutRateLimit: number;
    nonRedundantCritical: number;
    vendorLockIns: number;
  };
}

const VENDOR_LOCK_PROVIDERS = new Set(['stripe', 'supabase', 'neon', 'openai']);

export function reliabilityScore(graph: SystemGraph): ReliabilityResult {
  const findings: Finding[] = [];

  // 1. Single points of failure.
  const spofs = singlePointsOfFailure(graph);
  for (const node of spofs) {
    const weight = node.kind === 'database' ? 22 : 14;
    findings.push({
      category: 'spof',
      severity: severityFromWeight(weight),
      title: `${node.name} is a single point of failure`,
      description:
        `${node.name} (${node.kind}) has no redundancy and other components ` +
        `depend on it. Its failure takes down dependent functionality.`,
      nodeId: node.id,
      weight,
    });
  }

  // 2. Databases without backups.
  const dbsNoBackup = graph.nodes.filter(
    (n) => n.kind === 'database' && n.hasBackup === false,
  );
  for (const node of dbsNoBackup) {
    findings.push({
      category: 'backup',
      severity: 'critical',
      title: `${node.name} has no backups configured`,
      description: `Data loss in ${node.name} would be unrecoverable.`,
      nodeId: node.id,
      weight: 18,
    });
  }

  // 3. APIs / external APIs without rate limiting.
  const apisNoLimit = graph.nodes.filter(
    (n) =>
      (n.kind === 'api' || n.kind === 'external_api') &&
      n.hasRateLimit === false,
  );
  for (const node of apisNoLimit) {
    findings.push({
      category: 'rate_limit',
      severity: 'medium',
      title: `${node.name} has no rate limiting`,
      description:
        `${node.name} is exposed without rate limiting and is vulnerable to ` +
        `abuse and accidental overload.`,
      nodeId: node.id,
      weight: 8,
    });
  }

  // 4. Critical infra without redundancy (caches, queues).
  const fragileInfra = graph.nodes.filter(
    (n) =>
      (n.kind === 'cache' || n.kind === 'queue') && n.redundant === false,
  );
  for (const node of fragileInfra) {
    findings.push({
      category: 'redundancy',
      severity: 'high',
      title: `${node.name} has no redundancy`,
      description:
        `${node.name} (${node.kind}) runs as a single instance; its failure ` +
        `degrades the system.`,
      nodeId: node.id,
      weight: 12,
    });
  }

  // 5. Vendor lock-in for hard-to-replace external providers.
  const lockIns = graph.nodes.filter(
    (n) => n.provider && VENDOR_LOCK_PROVIDERS.has(n.provider),
  );
  for (const node of lockIns) {
    findings.push({
      category: 'vendor_lock_in',
      severity: 'low',
      title: `${node.name} vendor lock-in (${node.provider})`,
      description:
        `${node.name} relies on ${node.provider} with no documented ` +
        `fallback; an outage or pricing change has no mitigation.`,
      nodeId: node.id,
      weight: 4,
    });
  }

  const penalty = findings.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    score,
    findings: findings.sort((a, b) => b.weight - a.weight),
    summary: {
      spofCount: spofs.length,
      databasesWithoutBackup: dbsNoBackup.length,
      apisWithoutRateLimit: apisNoLimit.length,
      nonRedundantCritical: fragileInfra.length,
      vendorLockIns: lockIns.length,
    },
  };
}

export function findingsByNode(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!f.nodeId) continue;
    const list = map.get(f.nodeId) ?? [];
    list.push(f);
    map.set(f.nodeId, list);
  }
  return map;
}

export type { SystemNode };
