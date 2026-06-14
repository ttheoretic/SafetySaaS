import type { SystemGraph } from '@failsafe/shared';

/**
 * Lightweight layered SVG rendering of the dependency graph. Nodes are placed
 * in columns by topological depth from the entrypoints. Affected nodes can be
 * highlighted (used by the simulation page).
 */
export function SystemGraphView({
  graph,
  affected = [],
}: {
  graph: SystemGraph;
  affected?: string[];
}) {
  const depth = computeDepths(graph);
  const columns = new Map<number, string[]>();
  for (const node of graph.nodes) {
    const d = depth.get(node.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), node.id]);
  }

  const colWidth = 200;
  const rowHeight = 80;
  const positions = new Map<string, { x: number; y: number }>();
  for (const [col, ids] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    ids.forEach((id, i) => {
      positions.set(id, { x: 60 + col * colWidth, y: 50 + i * rowHeight });
    });
  }

  const maxCol = Math.max(...[...columns.keys()], 0);
  const maxRows = Math.max(...[...columns.values()].map((v) => v.length), 1);
  const width = 120 + maxCol * colWidth;
  const height = 60 + maxRows * rowHeight;
  const affectedSet = new Set(affected);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: 420 }}
    >
      {graph.edges.map((e, i) => {
        const a = positions.get(e.from);
        const b = positions.get(e.to);
        if (!a || !b) return null;
        const hit = affectedSet.has(e.from) || affectedSet.has(e.to);
        return (
          <line
            key={i}
            x1={a.x + 70}
            y1={a.y + 18}
            x2={b.x}
            y2={b.y + 18}
            stroke={hit ? '#ef4444' : '#3a4660'}
            strokeWidth={1.5}
          />
        );
      })}
      {graph.nodes.map((n) => {
        const p = positions.get(n.id)!;
        const hit = affectedSet.has(n.id);
        return (
          <g key={n.id}>
            <rect
              x={p.x}
              y={p.y}
              width={140}
              height={36}
              rx={8}
              fill={hit ? '#3a1620' : '#1a2234'}
              stroke={hit ? '#ef4444' : '#232c40'}
            />
            <text x={p.x + 10} y={p.y + 16} fill="#fff" fontSize={12}>
              {n.name}
            </text>
            <text x={p.x + 10} y={p.y + 29} fill="#8b97ad" fontSize={10}>
              {n.kind}
              {n.redundant ? ' · redundant' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function computeDepths(graph: SystemGraph): Map<string, number> {
  const incoming = new Map<string, number>();
  graph.nodes.forEach((n) => incoming.set(n.id, 0));
  graph.edges.forEach((e) =>
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1),
  );
  const depth = new Map<string, number>();
  const queue = graph.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  queue.forEach((n) => depth.set(n.id, 0));
  const adjacency = new Map<string, string[]>();
  graph.edges.forEach((e) =>
    adjacency.set(e.from, [...(adjacency.get(e.from) ?? []), e.to]),
  );
  let i = 0;
  while (i < queue.length) {
    const node = queue[i++];
    for (const next of adjacency.get(node.id) ?? []) {
      const nd = (depth.get(node.id) ?? 0) + 1;
      if (nd > (depth.get(next) ?? 0)) depth.set(next, nd);
      const target = graph.nodes.find((n) => n.id === next)!;
      if (!queue.includes(target)) queue.push(target);
    }
  }
  return depth;
}
