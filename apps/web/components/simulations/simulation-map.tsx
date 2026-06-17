'use client';

import type { SystemGraph, NodeKind } from '@riscly/shared';

/**
 * Standalone architecture map for simulation results. Lays the dependency graph
 * out in dependency-depth columns and highlights the services a scenario
 * affects (with a pulsing epicenter). Deliberately self-contained — it shares
 * the product's visual language but none of the Architecture page's machinery.
 */

const KIND_COLOR: Record<NodeKind, string> = {
  frontend: '#60a5fa',
  api: '#34d399',
  service: '#a78bfa',
  database: '#f59e0b',
  cache: '#f472b6',
  queue: '#22d3ee',
  external_api: '#fb923c',
  cdn: '#818cf8',
  dns: '#2dd4bf',
  storage: '#facc15',
};

const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 96;
const ROW_GAP = 28;
const PAD = 32;

export function SimulationMap({
  graph,
  affected = [],
  epicenter = [],
}: {
  graph: SystemGraph;
  affected?: string[];
  epicenter?: string[];
}) {
  const depth = computeDepths(graph);
  const columns = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }

  const pos = new Map<string, { x: number; y: number }>();
  const sortedCols = [...columns.entries()].sort((a, b) => a[0] - b[0]);
  for (const [col, ids] of sortedCols) {
    ids.forEach((id, i) => {
      pos.set(id, {
        x: PAD + col * (NODE_W + COL_GAP),
        y: PAD + i * (NODE_H + ROW_GAP),
      });
    });
  }

  const maxCol = Math.max(0, ...[...columns.keys()]);
  const maxRows = Math.max(1, ...[...columns.values()].map((v) => v.length));
  const width = PAD * 2 + maxCol * (NODE_W + COL_GAP) + NODE_W;
  const height = PAD * 2 + (maxRows - 1) * (NODE_H + ROW_GAP) + NODE_H;

  const affectedSet = new Set(affected);
  const epicenterSet = new Set(epicenter);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
    >
      <style>{`
        @keyframes simPulse { 0%,100% { opacity: .9 } 50% { opacity: .25 } }
        .sim-epicenter-ring { animation: simPulse 1.6s ease-in-out infinite; }
        .sim-flow { stroke-dasharray: 5 5; animation: simDash 1s linear infinite; }
        @keyframes simDash { to { stroke-dashoffset: -10; } }
      `}</style>
      <defs>
        <pattern id="simDots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--border)" opacity="0.5" />
        </pattern>
        <filter id="simGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="var(--destructive)" floodOpacity="0.5" />
        </filter>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="url(#simDots)" />

      {/* Edges */}
      {graph.edges.map((e, i) => {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b) return null;
        const hit = affectedSet.has(e.from) && affectedSet.has(e.to);
        const x1 = a.x + NODE_W;
        const y1 = a.y + NODE_H / 2;
        const x2 = b.x;
        const y2 = b.y + NODE_H / 2;
        const midX = (x1 + x2) / 2;
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke={hit ? 'var(--destructive)' : 'var(--border)'}
            strokeWidth={hit ? 2.25 : 1.25}
            strokeOpacity={hit ? 0.95 : 0.55}
            className={hit ? 'sim-flow' : undefined}
          />
        );
      })}

      {/* Nodes */}
      {graph.nodes.map((n) => {
        const p = pos.get(n.id)!;
        const hit = affectedSet.has(n.id);
        const epi = epicenterSet.has(n.id);
        const dot = KIND_COLOR[n.kind] ?? 'var(--primary)';
        return (
          <g key={n.id} filter={hit ? 'url(#simGlow)' : undefined}>
            {epi && (
              <rect
                className="sim-epicenter-ring"
                x={p.x - 4} y={p.y - 4} width={NODE_W + 8} height={NODE_H + 8} rx={14}
                fill="none" stroke="var(--destructive)" strokeWidth={2}
              />
            )}
            <rect
              x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={11}
              fill="var(--card)"
              stroke={hit ? 'var(--destructive)' : 'var(--border)'}
              strokeWidth={hit ? 1.5 : 1}
              opacity={affected.length && !hit ? 0.45 : 1}
            />
            {hit && (
              <rect
                x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={11}
                fill="var(--destructive)" opacity={0.12}
              />
            )}
            <circle cx={p.x + 16} cy={p.y + NODE_H / 2} r={5} fill={dot} />
            <text x={p.x + 30} y={p.y + 23} fill="var(--foreground)" fontSize={12.5} fontWeight={600}>
              {trunc(n.name, 18)}
            </text>
            <text x={p.x + 30} y={p.y + 40} fill="var(--muted-foreground)" fontSize={10.5}>
              {n.kind.replace(/_/g, ' ')}
              {n.redundant ? ' · redundant' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function computeDepths(graph: SystemGraph): Map<string, number> {
  const incoming = new Map<string, number>();
  graph.nodes.forEach((n) => incoming.set(n.id, 0));
  graph.edges.forEach((e) => incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1));
  const depth = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  graph.edges.forEach((e) => adjacency.set(e.from, [...(adjacency.get(e.from) ?? []), e.to]));
  const queue = graph.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  queue.forEach((n) => depth.set(n.id, 0));
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
  // Any node not reached (cycles / isolated) defaults to column 0.
  graph.nodes.forEach((n) => { if (!depth.has(n.id)) depth.set(n.id, 0); });
  return depth;
}
