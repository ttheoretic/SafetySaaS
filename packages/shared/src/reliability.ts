/**
 * Reliability Score Engine.
 *
 * Produces a deterministic score 0–100 plus the findings that explain it.
 * The score starts at 100 and subtracts weighted penalties for each risk,
 * floored at 0. Findings are the source of truth — the score is just their
 * aggregation — so reports can always trace a number back to its causes.
 */

import { Finding, severityFromWeight, Confidence } from './findings';
import { SystemGraph, SystemNode } from './model';
import { singlePointsOfFailure } from './graph';
import { vulnerabilitiesToFindings } from './vulnerabilities';

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

/** Max aggregate points code/dependency findings can subtract from the score, so
 *  a tail of low-severity markers can't single-handedly zero an otherwise sound
 *  system — yet enough that real insecure code lands firmly in the danger zone. */
const CODE_PENALTY_CAP = 80;
/** Symmetric cap on the topology penalty. */
const TOPOLOGY_PENALTY_CAP = 70;

/**
 * How much a finding counts toward the score, by confidence. A proven fact
 * (verified) counts in full; an AST result nearly so; a pattern/regex guess
 * counts less, since it may be a false positive. Keeps the score honest: what's
 * proven risky weighs more than what's merely suspected.
 */
function confidenceFactor(confidence?: Confidence): number {
  switch (confidence) {
    case 'verified':
      return 1;
    case 'high':
      return 0.85;
    case 'heuristic':
      return 0.6;
    default:
      return 1; // topology findings (derived from the graph) count in full
  }
}

const weighted = (findings: Finding[]): number =>
  findings.reduce((sum, f) => sum + f.weight * confidenceFactor(f.confidence), 0);

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

  // Topology penalty: confidence-weighted, capped for symmetry with code.
  const topologyPenalty = Math.min(TOPOLOGY_PENALTY_CAP, weighted(findings));

  // 6. Code-level findings (SAST: secrets, injection, insecure config) and
  //    dependency vulnerabilities (SCA: known CVEs) carried up by the scanner.
  //    These are real, located risks — a repo can be architecturally simple yet
  //    riddled with insecure code — so they must count toward the score and show
  //    up as risks, not just in the code view.
  const codeFindings: Finding[] = [
    ...(graph.codeFindings ?? []),
    ...vulnerabilitiesToFindings(graph.vulnerabilities ?? []),
  ];
  findings.push(...codeFindings);

  // Cap the *aggregate* code/dependency penalty so a long tail of low-severity
  // markers can't alone zero out the score, while still letting genuinely
  // insecure code push a repo deep into the danger zone. Confidence-weighted, so
  // a heuristic guess dents the score less than a verified fact.
  const codePenalty = Math.min(CODE_PENALTY_CAP, weighted(codeFindings));

  const penalty = topologyPenalty + codePenalty;
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
