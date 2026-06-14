/** Graph fragments and how they merge into a single SystemGraph. */

import { SystemGraph, SystemNode, SystemEdge } from '../model';

export interface GraphFragment {
  nodes: SystemNode[];
  edges: SystemEdge[];
}

/** Merge two nodes that share an id, preferring more-specific information. */
function mergeNode(a: SystemNode, b: SystemNode): SystemNode {
  return {
    ...a,
    ...b,
    name: b.name ?? a.name,
    provider: b.provider ?? a.provider,
    region: b.region ?? a.region,
    // For risk-relevant booleans, the *less safe* value wins so the scan never
    // hides a risk: a node is only "redundant"/"hasBackup" if every signal
    // agrees it is. `undefined` (unknown) defers to the other source.
    redundant: andDefined(a.redundant, b.redundant),
    hasBackup: andDefined(a.hasBackup, b.hasBackup),
    hasRateLimit: andDefined(a.hasRateLimit, b.hasRateLimit),
    hasAuth: andDefined(a.hasAuth, b.hasAuth),
    requestsPerMinute: b.requestsPerMinute ?? a.requestsPerMinute,
  };
}

function andDefined(
  a: boolean | undefined,
  b: boolean | undefined,
): boolean | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a && b;
}

/**
 * Combine fragments into one graph: nodes deduped by id (merged), edges deduped
 * by (from,to) keeping the highest criticality. Edges referencing unknown nodes
 * are dropped.
 */
export function mergeFragments(fragments: GraphFragment[]): SystemGraph {
  const nodes = new Map<string, SystemNode>();
  for (const frag of fragments) {
    for (const node of frag.nodes) {
      const existing = nodes.get(node.id);
      nodes.set(node.id, existing ? mergeNode(existing, node) : node);
    }
  }

  const edges = new Map<string, SystemEdge>();
  for (const frag of fragments) {
    for (const edge of frag.edges) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
      if (edge.from === edge.to) continue;
      const key = `${edge.from}->${edge.to}`;
      const existing = edges.get(key);
      const criticality = Math.max(
        existing?.criticality ?? 0,
        edge.criticality ?? 1,
      );
      edges.set(key, { from: edge.from, to: edge.to, criticality });
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
