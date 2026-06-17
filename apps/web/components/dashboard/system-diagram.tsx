'use client';

import type { SystemGraph } from '@riscly/shared';

/** Longest-path layering so dependencies flow left → right. */
function layout(graph: SystemGraph) {
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
      const target = graph.nodes.find((n) => n.id === next)!;
      if (!queue.includes(target)) queue.push(target);
    }
  }
  const columns = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }
  const colW = 188;
  const rowH = 70;
  const nodeW = 150;
  const nodeH = 44;
  const pos = new Map<string, { x: number; y: number }>();
  [...columns.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([col, ids]) => {
      ids.forEach((id, idx) => pos.set(id, { x: 28 + col * colW, y: 28 + idx * rowH }));
    });
  const maxCol = Math.max(...[...columns.keys()], 0);
  const maxRows = Math.max(...[...columns.values()].map((v) => v.length), 1);
  return {
    pos,
    nodeW,
    nodeH,
    width: 56 + maxCol * colW + nodeW,
    height: 28 + maxRows * rowH,
  };
}

/**
 * Supabase-style module diagram: each component is a rounded card with a live
 * status dot, dependencies drawn as connectors. Risky nodes glow red.
 */
export function SystemDiagram({
  graph,
  risky = new Set(),
  className = '',
  minWidth = 520,
}: {
  graph: SystemGraph;
  risky?: Set<string>;
  className?: string;
  minWidth?: number;
}) {
  const { pos, nodeW, nodeH, width, height } = layout(graph);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth }}>
        <defs>
          <pattern id="diagram-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--border)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#diagram-dots)" opacity="0.5" />

        {graph.edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + nodeW;
          const y1 = a.y + nodeH / 2;
          const x2 = b.x;
          const y2 = b.y + nodeH / 2;
          const mx = (x1 + x2) / 2;
          const hot = risky.has(e.to) || risky.has(e.from);
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={hot ? 'var(--destructive)' : 'var(--border)'}
              strokeWidth={hot ? 1.5 : 1.25}
              opacity={hot ? 0.7 : 1}
            />
          );
        })}

        {graph.nodes.map((n) => {
          const p = pos.get(n.id)!;
          const hit = risky.has(n.id);
          return (
            <g key={n.id}>
              <rect
                x={p.x}
                y={p.y}
                width={nodeW}
                height={nodeH}
                rx={10}
                fill="var(--card)"
                stroke={hit ? 'var(--destructive)' : 'var(--border)'}
                strokeWidth={hit ? 1.5 : 1}
              />
              <circle cx={p.x + 16} cy={p.y + nodeH / 2} r={4} fill={hit ? 'var(--destructive)' : 'var(--primary)'}>
                <animate
                  attributeName="opacity"
                  values="1;0.35;1"
                  dur="2s"
                  repeatCount="indefinite"
                  begin={`${(p.x + p.y) % 1000}ms`}
                />
              </circle>
              <text x={p.x + 28} y={p.y + 19} fill="var(--foreground)" fontSize={11.5} fontWeight={600}>
                {n.name.length > 17 ? n.name.slice(0, 16) + '…' : n.name}
              </text>
              <text x={p.x + 28} y={p.y + 32} fill="var(--muted-foreground)" fontSize={9.5}>
                {n.kind}
                {n.redundant ? ' · redundant' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
