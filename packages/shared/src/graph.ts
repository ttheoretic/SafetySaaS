/** Graph algorithms shared by the engines. */

import { SystemGraph, SystemNode, indexNodes } from './model';

/**
 * Nodes reachable from `roots` if `removed` nodes are deleted from the graph.
 * Used by the failure-simulation engine to determine blast radius: an outage
 * of a node disconnects everything downstream that depended on it.
 */
export function reachableFrom(
  graph: SystemGraph,
  roots: string[],
  removed: Set<string> = new Set(),
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (removed.has(edge.from) || removed.has(edge.to)) continue;
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge.to);
    adjacency.set(edge.from, list);
  }

  const seen = new Set<string>();
  const stack = roots.filter((r) => !removed.has(r));
  for (const r of stack) seen.add(r);
  while (stack.length) {
    const current = stack.pop()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

/** Edges at or above this criticality propagate failure to their source. */
export const CRITICAL_THRESHOLD = 0.8;

/**
 * The functional blast radius of failing `failed` nodes.
 *
 * A directly-failed node is down. Failure then propagates *upstream*: a node
 * that critically depends on a down node (outgoing edge with criticality ≥
 * CRITICAL_THRESHOLD) is itself impaired, transitively. This captures the fact
 * that an API that critically needs its database is broken when the database
 * is — even though, graph-wise, nothing is "downstream" of the database.
 */
export function failureImpact(
  graph: SystemGraph,
  failed: Iterable<string>,
): Set<string> {
  const down = new Set(failed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) {
      const criticality = edge.criticality ?? 1;
      if (
        criticality >= CRITICAL_THRESHOLD &&
        down.has(edge.to) &&
        !down.has(edge.from)
      ) {
        down.add(edge.from);
        changed = true;
      }
    }
  }
  return down;
}

/** The entry points of the system — frontends and public APIs. */
export function entrypoints(graph: SystemGraph): string[] {
  const roots = graph.nodes
    .filter((n) => n.kind === 'frontend' || n.kind === 'api')
    .map((n) => n.id);
  // Fall back to nodes with no incoming edges if nothing is tagged.
  if (roots.length) return roots;
  const hasIncoming = new Set(graph.edges.map((e) => e.to));
  return graph.nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
}

/**
 * A node is a single point of failure if removing it disconnects at least one
 * entrypoint from reachable functionality that it could otherwise reach, and
 * the node is not redundant. We approximate "the system is down" as: an
 * entrypoint can no longer reach any database/service it could before.
 */
export function singlePointsOfFailure(graph: SystemGraph): SystemNode[] {
  const byId = indexNodes(graph);
  const roots = new Set(entrypoints(graph));

  const spofs: SystemNode[] = [];
  for (const node of graph.nodes) {
    if (roots.has(node.id)) continue;
    if (node.redundant) continue;
    if (node.isSinglePointOfFailure) {
      spofs.push(node);
      continue;
    }
    // Failing this single node impairs at least one other component
    // (transitively, through critical dependencies).
    const impacted = failureImpact(graph, [node.id]);
    if (impacted.size > 1) {
      spofs.push(node);
    }
  }
  return spofs.map((n) => byId.get(n.id)!).filter(Boolean);
}
