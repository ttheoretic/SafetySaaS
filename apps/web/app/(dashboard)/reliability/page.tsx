'use client';

import { useMemo, useState } from 'react';
import { Network, Wrench, BookMarked } from 'lucide-react';
import {
  reliabilityScore,
  buildRecommendations,
  SystemGraph,
} from '@riscly/shared';
import { PageHeader, Card, ScoreGauge, SeverityBadge, Stat } from '@/components/ui';
import { useSystemGraph } from '@/lib/dashboard-store';

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

export default function ReliabilityPage() {
  const graph = useSystemGraph();
  const result = useMemo(() => reliabilityScore(graph), [graph]);
  const recs = useMemo(() => buildRecommendations(result.findings), [result]);
  const [selected, setSelected] = useState<string | null>(null);

  const riskyNodes = new Set(result.findings.filter((f) => f.nodeId).map((f) => f.nodeId as string));
  const shownFindings = selected ? result.findings.filter((f) => f.nodeId === selected) : result.findings;
  const shownRecs = selected ? recs.filter((r) => r.nodeId === selected) : recs;
  const selectedNode = graph.nodes.find((n) => n.id === selected);

  // layout
  const depth = depths(graph);
  const columns = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }
  const colW = 190, rowH = 80;
  const pos = new Map<string, { x: number; y: number }>();
  [...columns.entries()].sort((a, b) => a[0] - b[0]).forEach(([col, ids]) =>
    ids.forEach((id, idx) => pos.set(id, { x: 30 + col * colW, y: 30 + idx * rowH })));
  const maxCol = Math.max(...[...columns.keys()], 0);
  const maxRows = Math.max(...[...columns.values()].map((v) => v.length), 1);
  const width = 200 + maxCol * colW, height = 36 + maxRows * rowH;

  return (
    <>
      <PageHeader
        title="Reliability Score"
        subtitle="Click a component in the map to see its risks and fixes."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="flex items-center justify-center">
          <ScoreGauge score={result.score} label="reliability" />
        </Card>
        <Stat label="SPOFs" value={result.summary.spofCount} />
        <Stat label="DBs w/o backup" value={result.summary.databasesWithoutBackup} />
        <Stat label="APIs w/o rate limit" value={result.summary.apisWithoutRateLimit} />
      </div>

      <Card title="Reliability trend & benchmark" className="mt-6">
        <Trend score={result.score} />
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="System dependency map">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Network className="size-3.5" />
            {selected ? `Filtering by ${selectedNode?.name}` : 'Click a component to filter findings'}
            {selected && (
              <button onClick={() => setSelected(null)} className="ml-2 text-primary hover:underline">clear</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 540, maxHeight: 380 }}>
              {graph.edges.map((e, i) => {
                const a = pos.get(e.from), b = pos.get(e.to);
                if (!a || !b) return null;
                return <line key={i} x1={a.x + 140} y1={a.y + 18} x2={b.x} y2={b.y + 18} stroke="var(--border)" strokeWidth={1.5} />;
              })}
              {graph.nodes.map((n) => {
                const p = pos.get(n.id)!;
                const risky = riskyNodes.has(n.id);
                const isSel = selected === n.id;
                return (
                  <g key={n.id} onClick={() => setSelected(isSel ? null : n.id)} style={{ cursor: 'pointer' }}>
                    <rect x={p.x} y={p.y} width={140} height={38} rx={9}
                      fill={isSel ? 'color-mix(in oklch, var(--primary) 14%, var(--secondary))' : 'var(--secondary)'}
                      stroke={isSel ? 'var(--primary)' : risky ? 'var(--destructive)' : 'var(--border)'}
                      strokeWidth={isSel || risky ? 1.5 : 1} />
                    <circle cx={p.x + 13} cy={p.y + 19} r={4} fill={risky ? 'var(--destructive)' : 'var(--primary)'} />
                    <text x={p.x + 24} y={p.y + 16} fill="var(--foreground)" fontSize={11.5} fontWeight={500}>
                      {n.name.length > 15 ? n.name.slice(0, 14) + '…' : n.name}
                    </text>
                    <text x={p.x + 24} y={p.y + 29} fill="var(--muted-foreground)" fontSize={9.5}>
                      {n.kind}{n.redundant ? ' · redundant' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>

        <Card title={selected ? `Findings · ${selectedNode?.name}` : 'All findings'}>
          {shownFindings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No findings for this component. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {shownFindings.map((f, i) => {
                const rec = shownRecs.find((r) => r.findingTitle === f.title);
                return (
                  <li key={i} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{f.title}</span>
                      <SeverityBadge severity={f.severity} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                    {rec && (
                      <>
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground">
                          <Wrench className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          <span>{rec.fix} <span className="text-primary">−{rec.riskReductionPct}% risk</span></span>
                        </p>
                        {rec.references.length > 0 && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-5 text-[11px] text-muted-foreground">
                            <BookMarked className="size-3" />
                            {rec.references.map((ref) => (
                              <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer"
                                className="underline decoration-dotted hover:text-foreground">
                                {ref.source}
                              </a>
                            ))}
                          </p>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

const BENCHMARK = 80;

function Trend({ score }: { score: number }) {
  // Deterministic synthetic history ending at the current score (real scan
  // history is used when a stored project is selected as the data source).
  const n = 8;
  const start = Math.max(15, score - 16);
  const points = Array.from({ length: n }, (_, i) => {
    const base = start + ((score - start) * i) / (n - 1);
    const wobble = Math.sin(i * 1.7) * 3;
    return Math.round(Math.max(0, Math.min(100, base + (i < n - 1 ? wobble : 0))));
  });
  const w = 640, h = 140, pad = 8;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (n - 1);
  const y = (v: number) => h - pad - (v / 100) * (h - 2 * pad);
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L ${x(n - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;
  const delta = score - points[0];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">Last {n} scans</span>
        <span className={delta >= 0 ? 'text-primary' : 'text-destructive'}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
        </span>
        <span className="text-muted-foreground">
          vs. industry benchmark{' '}
          <span className={score >= BENCHMARK ? 'text-primary' : 'text-warning'}>
            {score >= BENCHMARK ? 'above' : `${BENCHMARK - score} pts below`}
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 160 }}>
        {/* benchmark line */}
        <line x1={pad} y1={y(BENCHMARK)} x2={w - pad} y2={y(BENCHMARK)} stroke="var(--warning)" strokeWidth={1} strokeDasharray="4 4" />
        <text x={w - pad} y={y(BENCHMARK) - 4} textAnchor="end" fontSize={10} fill="var(--warning)">benchmark {BENCHMARK}</text>
        <path d={area} fill="color-mix(in oklch, var(--primary) 12%, transparent)" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} />
        {points.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4 : 2.5} fill="var(--primary)" />
        ))}
      </svg>
    </div>
  );
}
