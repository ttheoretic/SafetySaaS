'use client';

import { Network } from 'lucide-react';
import type { SystemGraph } from '@riscly/shared';
import { useDashboard } from '@/lib/dashboard-store';

function depths(graph: SystemGraph): Map<string, number> {
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
  return depth;
}

export function SystemMap() {
  const { systemGraph: graph, topFindings } = useDashboard();
  const risky = new Set(topFindings.filter((f) => f.nodeId).map((f) => f.nodeId as string));
  const depth = depths(graph);
  const columns = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }
  const colW = 200;
  const rowH = 78;
  const pos = new Map<string, { x: number; y: number }>();
  [...columns.entries()].sort((a, b) => a[0] - b[0]).forEach(([col, ids]) => {
    ids.forEach((id, idx) => pos.set(id, { x: 40 + col * colW, y: 36 + idx * rowH }));
  });
  const maxCol = Math.max(...[...columns.keys()], 0);
  const maxRows = Math.max(...[...columns.values()].map((v) => v.length), 1);
  const width = 220 + maxCol * colW;
  const height = 40 + maxRows * rowH;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Network className="size-4 text-primary" />
        System Dependency Map
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Components flagged with risk are highlighted. Failure propagates along critical edges.
      </p>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 560, maxHeight: 360 }}>
          {graph.edges.map((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            return (
              <line key={i} x1={a.x + 150} y1={a.y + 18} x2={b.x} y2={b.y + 18}
                stroke="var(--border)" strokeWidth={1.5} />
            );
          })}
          {graph.nodes.map((n) => {
            const p = pos.get(n.id)!;
            const hit = risky.has(n.id);
            return (
              <g key={n.id}>
                <rect x={p.x} y={p.y} width={150} height={38} rx={9}
                  fill="var(--secondary)"
                  stroke={hit ? 'var(--destructive)' : 'var(--border)'}
                  strokeWidth={hit ? 1.5 : 1} />
                <circle cx={p.x + 14} cy={p.y + 19} r={4}
                  fill={hit ? 'var(--destructive)' : 'var(--primary)'} />
                <text x={p.x + 26} y={p.y + 16} fill="var(--foreground)" fontSize={11.5} fontWeight={500}>
                  {n.name.length > 16 ? n.name.slice(0, 15) + '…' : n.name}
                </text>
                <text x={p.x + 26} y={p.y + 29} fill="var(--muted-foreground)" fontSize={9.5}>
                  {n.kind}{n.redundant ? ' · redundant' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
