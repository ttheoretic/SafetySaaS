import {
  reliabilityScore,
  securitySimulation,
  type SystemGraph,
  type NodeKind,
  type Finding,
} from '@riscly/shared';

/** Risk severities, plus a healthy "ok" state for low-risk modules/links. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'ok';

export type ModuleType = NodeKind;

export interface ModuleFinding {
  title: string;
  severity: Severity;
  description?: string;
}

export interface ArchModule {
  id: string;
  name: string;
  type: ModuleType;
  tech: string;
  /** 0..100 — higher means riskier. */
  riskScore: number;
  uptime: string;
  description: string;
  position: { x: number; y: number };
  metrics: { label: string; value: string }[];
  findings: ModuleFinding[];
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  risk: Severity;
}

export const severityMeta: Record<Severity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#f43f5e' },
  high: { label: 'High', color: '#f59e0b' },
  medium: { label: 'Medium', color: '#eab308' },
  low: { label: 'Low', color: '#64748b' },
  ok: { label: 'Healthy', color: '#10b981' },
};

export const moduleTypeLabel: Record<ModuleType, string> = {
  frontend: 'Frontend',
  api: 'API Gateway',
  service: 'Service',
  database: 'Database',
  cache: 'Cache',
  queue: 'Queue',
  external_api: 'Third-party',
  cdn: 'CDN',
  dns: 'DNS',
  storage: 'Storage',
};

export function scoreToSeverity(score: number): Severity {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 22) return 'medium';
  if (score >= 8) return 'low';
  return 'ok';
}

const SEV_RANK: Record<Severity, number> = { ok: 0, low: 1, medium: 2, high: 3, critical: 4 };
const SEV_RISK: Record<Severity, number> = { ok: 0, low: 6, medium: 12, high: 22, critical: 32 };

function worst(a: Severity, b: Severity): Severity {
  return SEV_RANK[a] >= SEV_RANK[b] ? a : b;
}

/** Longest-path layering so dependencies flow left → right. */
function layout(graph: SystemGraph): Map<string, { x: number; y: number }> {
  const incoming = new Map<string, number>();
  graph.nodes.forEach((n) => incoming.set(n.id, 0));
  graph.edges.forEach((e) => incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1));
  const depth = new Map<string, number>();
  const queue = graph.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  queue.forEach((n) => depth.set(n.id, 0));
  const adj = new Map<string, string[]>();
  graph.edges.forEach((e) => adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]));
  let i = 0;
  while (i < queue.length) {
    const node = queue[i++];
    for (const next of adj.get(node.id) ?? []) {
      const nd = (depth.get(node.id) ?? 0) + 1;
      if (nd > (depth.get(next) ?? 0)) depth.set(next, nd);
      const t = graph.nodes.find((n) => n.id === next)!;
      if (!queue.includes(t)) queue.push(t);
    }
  }
  const columns = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  const colW = 300;
  const rowH = 150;
  [...columns.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([col, ids]) => {
      ids.forEach((id, idx) => pos.set(id, { x: col * colW, y: idx * rowH }));
    });
  return pos;
}

function metricsFor(
  node: SystemGraph['nodes'][number],
): { label: string; value: string }[] {
  return [
    { label: 'Load', value: node.requestsPerMinute ? `${node.requestsPerMinute}/min` : '—' },
    { label: 'Redundancy', value: node.redundant ? 'HA' : 'Single' },
    { label: node.kind === 'database' || node.kind === 'storage' ? 'Backups' : 'Region', value:
        node.kind === 'database' || node.kind === 'storage'
          ? node.hasBackup ? 'On' : 'Off'
          : node.region ?? node.provider ?? '—' },
  ];
}

/**
 * Turn a live system graph into the interactive architecture model: every node
 * becomes a module with a risk score derived from the reliability + security
 * engines, every dependency an edge coloured by the risk it carries.
 */
export function buildArchitecture(graph: SystemGraph): {
  modules: ArchModule[];
  edges: ArchEdge[];
} {
  const rel = reliabilityScore(graph);
  const sec = securitySimulation(graph);
  const findings: Finding[] = [...rel.findings, ...sec.findings];

  const byNode = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!f.nodeId) continue;
    byNode.set(f.nodeId, [...(byNode.get(f.nodeId) ?? []), f]);
  }

  const pos = layout(graph);
  const risk = new Map<string, number>();

  const modules: ArchModule[] = graph.nodes.map((n) => {
    const fs = byNode.get(n.id) ?? [];
    let score = 6; // healthy baseline
    for (const f of fs) score += SEV_RISK[f.severity as Severity] ?? 8;
    if (!n.redundant && (n.kind === 'database' || n.kind === 'api')) score += 6;
    score = Math.min(98, score);
    risk.set(n.id, score);

    return {
      id: n.id,
      name: n.name,
      type: n.kind,
      tech: n.provider ? n.provider.toUpperCase() : moduleTypeLabel[n.kind],
      riskScore: score,
      uptime: `${Math.max(95, 99.99 - score * 0.06).toFixed(2)}%`,
      description: fs.length
        ? `${fs.length} open finding${fs.length > 1 ? 's' : ''} affecting reliability and security posture.`
        : 'No active findings — this module passed all reliability and security checks.',
      position: pos.get(n.id) ?? { x: 0, y: 0 },
      metrics: metricsFor(n),
      findings: fs.map((f) => ({
        title: f.title,
        severity: f.severity as Severity,
        description: f.description,
      })),
    };
  });

  const edges: ArchEdge[] = graph.edges.map((e, i) => {
    const sSev = scoreToSeverity(risk.get(e.from) ?? 0);
    const tSev = scoreToSeverity(risk.get(e.to) ?? 0);
    let r = worst(sSev, tSev);
    // A highly-critical dependency on a non-trivial target carries more weight.
    if ((e.criticality ?? 0) >= 0.8 && SEV_RANK[r] < SEV_RANK.medium) r = 'medium';
    return { id: `${e.from}-${e.to}-${i}`, source: e.from, target: e.to, risk: r };
  });

  return { modules, edges };
}
