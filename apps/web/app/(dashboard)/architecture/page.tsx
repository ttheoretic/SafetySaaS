'use client';

import { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, Network, Maximize } from 'lucide-react';
import type { SystemGraph } from '@riscly/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';
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
      const t = graph.nodes.find((n) => n.id === next)!;
      if (!queue.includes(t)) queue.push(t);
    }
  }
  return depth;
}

const CRITICAL = 0.8;

export default function ArchitecturePage() {
  const { systemGraph: graph, topFindings } = useDashboard();
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const riskyNodes = useMemo(
    () => new Set(topFindings.filter((f) => f.nodeId).map((f) => f.nodeId as string)),
    [topFindings],
  );
  // critical-path edges (high criticality) for highlighting failure propagation
  const criticalEdges = new Set(graph.edges.filter((e) => (e.criticality ?? 1) >= CRITICAL).map((e) => `${e.from}->${e.to}`));

  const depth = depths(graph);
  const columns = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }
  const colW = 200, rowH = 86;
  const pos = new Map<string, { x: number; y: number }>();
  [...columns.entries()].sort((a, b) => a[0] - b[0]).forEach(([col, ids]) =>
    ids.forEach((id, idx) => pos.set(id, { x: 30 + col * colW, y: 30 + idx * rowH })));
  const maxCol = Math.max(...[...columns.keys()], 0);
  const maxRows = Math.max(...[...columns.values()].map((v) => v.length), 1);
  const width = 200 + maxCol * colW, height = 40 + maxRows * rowH;

  const node = graph.nodes.find((n) => n.id === selected);
  const nodeFindings = topFindings.filter((f) => f.nodeId === selected);

  return (
    <>
      <PageHeader
        title="System Architecture"
        subtitle="Explore the dependency graph. Risky components are outlined; critical paths (failure propagation) are highlighted."
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="System map">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Network className="size-3.5" /> {graph.nodes.length} components · {graph.edges.length} dependencies
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"><ZoomOut className="size-4" /></button>
              <button onClick={() => setZoom(1)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"><Maximize className="size-4" /></button>
              <button onClick={() => setZoom((z) => Math.min(1.8, z + 0.2))} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"><ZoomIn className="size-4" /></button>
            </div>
          </div>
          <div className="overflow-auto rounded-lg border border-border bg-background/40" style={{ maxHeight: 460 }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: width * zoom, height: height * zoom, minWidth: '100%' }}>
              {graph.edges.map((e, i) => {
                const a = pos.get(e.from), b = pos.get(e.to);
                if (!a || !b) return null;
                const crit = criticalEdges.has(`${e.from}->${e.to}`);
                return <line key={i} x1={a.x + 150} y1={a.y + 18} x2={b.x} y2={b.y + 18}
                  stroke={crit ? 'color-mix(in oklch, var(--destructive) 55%, transparent)' : 'var(--border)'}
                  strokeWidth={crit ? 2 : 1.25} strokeDasharray={crit ? '0' : '0'} />;
              })}
              {graph.nodes.map((n) => {
                const p = pos.get(n.id)!;
                const risky = riskyNodes.has(n.id);
                const isSel = selected === n.id;
                return (
                  <g key={n.id} onClick={() => setSelected(isSel ? null : n.id)} style={{ cursor: 'pointer' }}>
                    <rect x={p.x} y={p.y} width={150} height={40} rx={10}
                      fill={isSel ? 'color-mix(in oklch, var(--primary) 14%, var(--secondary))' : 'var(--secondary)'}
                      stroke={isSel ? 'var(--primary)' : risky ? 'var(--destructive)' : 'var(--border)'}
                      strokeWidth={isSel || risky ? 1.5 : 1} />
                    <circle cx={p.x + 14} cy={p.y + 20} r={4} fill={risky ? 'var(--destructive)' : n.redundant ? 'var(--primary)' : 'var(--warning)'} />
                    <text x={p.x + 26} y={p.y + 17} fill="var(--foreground)" fontSize={12} fontWeight={500}>
                      {n.name.length > 16 ? n.name.slice(0, 15) + '…' : n.name}
                    </text>
                    <text x={p.x + 26} y={p.y + 31} fill="var(--muted-foreground)" fontSize={10}>
                      {n.kind}{n.redundant ? ' · redundant' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-destructive" /> has risk</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> redundant</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> single instance</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-destructive/60" /> critical path</span>
          </div>
        </Card>

        <Card title={node ? node.name : 'Component details'}>
          {!node ? (
            <p className="text-sm text-muted-foreground">Click a component to inspect its risk level, redundancy and findings.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Attr label="Kind" value={node.kind} />
                <Attr label="Provider" value={node.provider ?? '—'} />
                <Attr label="Redundant" value={node.redundant ? 'Yes' : 'No'} ok={node.redundant} />
                <Attr label="Backups" value={node.hasBackup === undefined ? '—' : node.hasBackup ? 'Yes' : 'No'} ok={node.hasBackup} />
                <Attr label="Rate limit" value={node.hasRateLimit === undefined ? '—' : node.hasRateLimit ? 'Yes' : 'No'} ok={node.hasRateLimit} />
                <Attr label="Region" value={node.region ?? '—'} />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Findings</div>
                {nodeFindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No risks on this component. 🎉</p>
                ) : (
                  <ul className="space-y-2">
                    {nodeFindings.map((f, i) => (
                      <li key={i} className="rounded-md border border-border bg-background/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-foreground">{f.title}</span>
                          <SeverityBadge severity={f.severity} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Attr({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm capitalize ${ok === false ? 'text-destructive' : ok === true ? 'text-primary' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
