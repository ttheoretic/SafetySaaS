/**
 * Scanner orchestration (pure).
 *
 * Turns a ScanCollection (normalized signals from all connected providers)
 * into a single SystemGraph, then infers cross-provider edges so resources
 * discovered by different adapters are wired together.
 */

import { SystemGraph, SystemNode } from '../model';
import { GraphFragment, mergeFragments } from './fragment';
import { AiComponentSignal, ScanCollection } from './signals';
import {
  repoFragment,
  cloudFragment,
  databaseFragment,
  billingFragment,
} from './adapters';

const BACKING_KINDS = new Set(['database', 'cache', 'queue', 'storage', 'external_api']);

/**
 * Fold discovered AI components into the graph as first-class nodes.
 *
 * Models and agents are part of the application's architecture, not a footnote:
 * an agent can reach a database, and a model is an external dependency that can
 * fail, rate-limit or leak. Wiring them in means every downstream analysis —
 * blast radius, attack paths, simulations — sees them too.
 *
 * Callers are the service tier (an agent runs your code); when no agent exists
 * the services talk to the model directly.
 */
export function attachAiComponents(
  graph: SystemGraph,
  components: AiComponentSignal[],
): SystemGraph {
  if (components.length === 0) return graph;

  // Merge duplicates discovered across several repos.
  const unique = new Map<string, AiComponentSignal>();
  for (const c of components) if (!unique.has(c.id)) unique.set(c.id, c);
  const fresh = [...unique.values()].filter(
    (c) => !graph.nodes.some((n) => n.id === c.id),
  );
  if (fresh.length === 0) return graph;

  const callers = graph.nodes
    .filter((n) => n.kind === 'api' || n.kind === 'service')
    .map((n) => n.id);
  // With no service tier yet, hang the AI components off the entrypoints so
  // they are still reachable in the graph rather than floating.
  const from = callers.length
    ? callers
    : graph.nodes.filter((n) => n.kind === 'frontend').map((n) => n.id);

  const nodes: SystemNode[] = fresh.map((c) => ({
    id: c.id,
    kind: c.kind,
    name: c.name,
    ...(c.provider ? { provider: c.provider } : {}),
    // Inferred from code, not read from a provider inventory.
    estimated: true,
    ...(c.kind === 'ai_model' ? { hasAuth: true, hasRateLimit: true } : {}),
  }));

  const agent = fresh.find((c) => c.kind === 'ai_agent');
  const edges = [...graph.edges];
  if (agent) {
    for (const f of from) edges.push({ from: f, to: agent.id, criticality: 0.5 });
    for (const c of fresh) {
      if (c.id !== agent.id) edges.push({ from: agent.id, to: c.id, criticality: 0.8 });
    }
  } else {
    for (const f of from) {
      for (const c of fresh) edges.push({ from: f, to: c.id, criticality: 0.5 });
    }
  }

  return { ...graph, nodes: [...graph.nodes, ...nodes], edges };
}

export function buildSystemGraph(collection: ScanCollection): SystemGraph {
  const fragments: GraphFragment[] = [];
  for (const repo of collection.repos ?? []) fragments.push(repoFragment(repo));
  for (const cloud of collection.clouds ?? []) fragments.push(cloudFragment(cloud));
  for (const db of collection.databases ?? []) fragments.push(databaseFragment(db));
  for (const b of collection.billing ?? []) fragments.push(billingFragment(b));

  const graph = connectOrphans(dedupeEstimated(mergeFragments(fragments)));

  // Carry any per-repo code-analysis results (SCA vulnerabilities + code/config
  // findings) up to the graph, so they flow through persistence and the
  // dashboard alongside the topology.
  const repos = collection.repos ?? [];
  const vulnerabilities = repos.flatMap((r) => r.vulnerabilities ?? []);
  // Full SBOM component set, de-duplicated across repos/lockfiles.
  const compSeen = new Set<string>();
  const components = repos
    .flatMap((r) => r.components ?? [])
    .filter((c) => {
      const k = `${c.ecosystem}:${c.name}@${c.version}`;
      return compSeen.has(k) ? false : (compSeen.add(k), true);
    });
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
  // Maintainability hotspots, ranked across all repos (top 50 to bound size).
  const qualityHotspots = repos
    .flatMap((r) => (r.qualityHotspots ?? []).map((h) => ({ ...h, repo: h.repo ?? r.repo })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
  const qualitySummary = qualityHotspots.length
    ? {
        filesAnalyzed: qualityHotspots.length,
        hotspotCount: qualityHotspots.filter((h) => h.score >= 40).length,
        avgScore: Math.round(
          qualityHotspots.reduce((s, h) => s + h.score, 0) / qualityHotspots.length,
        ),
        totalTodos: qualityHotspots.reduce((s, h) => s + h.todos, 0),
        worstFile: qualityHotspots[0]?.file,
      }
    : undefined;
  const withAi = attachAiComponents(
    graph,
    repos.flatMap((r) => r.aiComponents ?? []),
  );

  return {
    ...withAi,
    ...(vulnerabilities.length ? { vulnerabilities } : {}),
    ...(components.length ? { components } : {}),
    ...(codeFindings.length ? { codeFindings } : {}),
    ...(codeIssues.length ? { codeIssues } : {}),
    ...(qualityHotspots.length ? { qualityHotspots } : {}),
    ...(qualitySummary ? { qualitySummary } : {}),
  };
}

/**
 * Collapse code-inferred ("estimated") nodes into the verified node a connected
 * collector produced for the same thing, so connecting Vercel/Supabase/… doesn't
 * leave a duplicate (and a disconnected one). An estimated node merges into a
 * verified node when they share provider+kind, or — for an estimated node with
 * no provider — when there's exactly one verified node of that kind. The
 * verified node keeps its facts and inherits the estimated node's edges.
 */
function dedupeEstimated(graph: SystemGraph): SystemGraph {
  const estimated = graph.nodes.filter((n) => n.estimated);
  const verified = graph.nodes.filter((n) => !n.estimated);
  if (estimated.length === 0 || verified.length === 0) return graph;

  // Only frontend/api are logically singletons per repo, so a no-provider
  // estimate may merge into the sole verified one of that kind. Backing services
  // (databases, caches, …) require an EXACT provider match — an app can have a
  // separate Postgres AND a Supabase, so never collapse them by kind alone.
  const SINGLETON_KINDS = new Set(['frontend', 'api']);
  const remap = new Map<string, string>(); // estimated id → verified id
  for (const e of estimated) {
    // Prefer an exact provider match.
    let v =
      e.provider !== undefined
        ? verified.find((x) => x.kind === e.kind && x.provider === e.provider)
        : undefined;
    // A repo has one frontend and one api: if there's no provider match, an
    // estimated frontend/api still collapses into the sole verified node of
    // that kind — even when it carries a (different) provider, e.g. the
    // code-inferred "<repo> API" folding into a verified hosting/service api.
    // Backing services (db/cache/…) are NOT singletons and still need an exact
    // provider match, so they are never collapsed by kind alone.
    if (!v && SINGLETON_KINDS.has(e.kind)) {
      const sameKind = verified.filter((x) => x.kind === e.kind);
      if (sameKind.length === 1) v = sameKind[0];
    }
    if (v && v.id !== e.id) remap.set(e.id, v.id);
  }
  if (remap.size === 0) return graph;

  // Fill any gaps on the verified node from its estimated twin (verified wins).
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const [eid, vid] of remap) {
    const e = byId.get(eid)!;
    const v = byId.get(vid)!;
    if (v.hasRateLimit === undefined) v.hasRateLimit = e.hasRateLimit;
    if (v.hasAuth === undefined) v.hasAuth = e.hasAuth;
    if (v.hasBackup === undefined) v.hasBackup = e.hasBackup;
    if (v.redundant === undefined) v.redundant = e.redundant;
    if (v.region === undefined) v.region = e.region;
  }

  const nodes = graph.nodes.filter((n) => !remap.has(n.id));
  const seen = new Set<string>();
  const edges = graph.edges
    .map((ed) => ({
      ...ed,
      from: remap.get(ed.from) ?? ed.from,
      to: remap.get(ed.to) ?? ed.to,
    }))
    .filter((ed) => ed.from !== ed.to)
    .filter((ed) => {
      const key = `${ed.from}->${ed.to}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  return { nodes, edges };
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
