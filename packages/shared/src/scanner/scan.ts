/**
 * Scanner orchestration (pure).
 *
 * Turns a ScanCollection (normalized signals from all connected providers)
 * into a single SystemGraph, then infers cross-provider edges so resources
 * discovered by different adapters are wired together.
 */

import { SystemGraph, SystemNode } from '../model';
import { GraphFragment, mergeFragments } from './fragment';
import { ScanCollection } from './signals';
import {
  repoFragment,
  cloudFragment,
  databaseFragment,
  billingFragment,
} from './adapters';

const BACKING_KINDS = new Set(['database', 'cache', 'queue', 'storage', 'external_api']);

export function buildSystemGraph(collection: ScanCollection): SystemGraph {
  const fragments: GraphFragment[] = [];
  for (const repo of collection.repos ?? []) fragments.push(repoFragment(repo));
  for (const cloud of collection.clouds ?? []) fragments.push(cloudFragment(cloud));
  for (const db of collection.databases ?? []) fragments.push(databaseFragment(db));
  for (const b of collection.billing ?? []) fragments.push(billingFragment(b));

  const graph = connectOrphans(mergeFragments(fragments));

  // Carry any per-repo code-analysis results (SCA vulnerabilities + code/config
  // findings) up to the graph, so they flow through persistence and the
  // dashboard alongside the topology.
  const repos = collection.repos ?? [];
  const vulnerabilities = repos.flatMap((r) => r.vulnerabilities ?? []);
  const codeFindings = [
    ...repos.flatMap((r) => r.codeFindings ?? []),
    // Infra-level findings (e.g. Supabase auth/RLS, AWS security groups) are read
    // from the live source of truth — default them to verified confidence.
    ...(collection.findings ?? []).map((f) => ({
      confidence: 'verified' as const,
      ...f,
    })),
  ];
  const codeIssues = repos.flatMap((r) =>
    (r.codeIssues ?? []).map((c) => ({ ...c, repo: c.repo ?? r.repo })),
  );
  return {
    ...graph,
    ...(vulnerabilities.length ? { vulnerabilities } : {}),
    ...(codeFindings.length ? { codeFindings } : {}),
    ...(codeIssues.length ? { codeIssues } : {}),
  };
}

/**
 * Connect backing services (databases, caches, …) discovered by cloud/database
 * adapters that ended up with no incoming edge: wire them from the primary API
 * node, so they participate in reliability and simulation analysis instead of
 * floating disconnected.
 */
function connectOrphans(graph: SystemGraph): SystemGraph {
  const api = pickPrimaryApi(graph);
  if (!api) return graph;

  const hasIncoming = new Set(graph.edges.map((e) => e.to));
  const newEdges = [...graph.edges];
  for (const node of graph.nodes) {
    if (node.id === api.id) continue;
    if (!BACKING_KINDS.has(node.kind)) continue;
    if (hasIncoming.has(node.id)) continue;
    newEdges.push({
      from: api.id,
      to: node.id,
      criticality: node.kind === 'database' ? 1 : node.kind === 'external_api' ? 0.6 : 0.7,
    });
  }
  return { nodes: graph.nodes, edges: newEdges };
}

/** The API node most things should hang off: the one with the most outgoing
 *  edges, falling back to the first api/service node. */
function pickPrimaryApi(graph: SystemGraph): SystemNode | undefined {
  const apis = graph.nodes.filter((n) => n.kind === 'api' || n.kind === 'service');
  if (!apis.length) return undefined;
  const outgoing = new Map<string, number>();
  for (const e of graph.edges)
    outgoing.set(e.from, (outgoing.get(e.from) ?? 0) + 1);
  return [...apis].sort(
    (a, b) => (outgoing.get(b.id) ?? 0) - (outgoing.get(a.id) ?? 0),
  )[0];
}
