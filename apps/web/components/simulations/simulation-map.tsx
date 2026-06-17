'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import type { SystemGraph, NodeKind } from '@riscly/shared';

/**
 * Standalone, pannable/zoomable architecture map for simulation results. Lays
 * the dependency graph out in depth columns and reveals the affected services
 * wave-by-wave (a flowing propagation animation) once `revealed` is set.
 * Self-contained — shares the product's look, none of the Architecture page's
 * machinery.
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
const PAD = 40;
const WAVE_MS = 320;

export function SimulationMap({
  graph,
  affected = [],
  epicenter = [],
  revealed = true,
}: {
  graph: SystemGraph;
  affected?: string[];
  epicenter?: string[];
  revealed?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; a: number; d: number } | null>(null);

  const layout = useMemo(() => buildLayout(graph), [graph]);
  const waves = useMemo(() => computeWaves(graph, affected, epicenter), [graph, affected, epicenter]);

  const affectedSet = useMemo(() => new Set(affected), [affected]);
  const epicenterSet = useMemo(() => new Set(epicenter), [epicenter]);

  /* ---- pan / zoom ---- */
  const clientToView = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: cx, y: cy };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const p = clientToView(e.clientX, e.clientY);
    setT((cur) => {
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const k2 = Math.min(3, Math.max(0.4, cur.k * factor));
      const r = k2 / cur.k;
      return { k: k2, x: p.x - r * (p.x - cur.x), y: p.y - r * (p.y - cur.y) };
    });
  }, [clientToView]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const ctm = svgRef.current!.getScreenCTM();
    if (!ctm) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: t.x, oy: t.y, a: ctm.a, d: ctm.d };
  }, [t.x, t.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setT((cur) => ({ ...cur, x: d.ox + (e.clientX - d.x) / d.a, y: d.oy + (e.clientY - d.y) / d.d }));
  }, []);

  const endDrag = useCallback(() => { drag.current = null; }, []);

  const zoom = (factor: number) =>
    setT((cur) => {
      const k2 = Math.min(3, Math.max(0.4, cur.k * factor));
      const cx = layout.width / 2, cy = layout.height / 2;
      const r = k2 / cur.k;
      return { k: k2, x: cx - r * (cx - cur.x), y: cy - r * (cy - cur.y) };
    });
  const reset = () => setT({ x: 0, y: 0, k: 1 });

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-lg border border-border bg-popover/90 p-1 backdrop-blur">
        <CtrlBtn onClick={() => zoom(1.2)}><Plus className="size-4" /></CtrlBtn>
        <CtrlBtn onClick={() => zoom(1 / 1.2)}><Minus className="size-4" /></CtrlBtn>
        <CtrlBtn onClick={reset}><Maximize2 className="size-4" /></CtrlBtn>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <style>{`
          @keyframes simReveal { from { opacity:0; transform: scale(.96) } to { opacity:1; transform: scale(1) } }
          @keyframes simPulse { 0%,100% { opacity:.95 } 50% { opacity:.25 } }
          @keyframes simDash { to { stroke-dashoffset:-12 } }
          @keyframes simScan { 0%,100% { opacity:.05 } 50% { opacity:.18 } }
          .sim-reveal { animation: simReveal .5s ease-out both; transform-box: fill-box; transform-origin: center; }
          .sim-ring { animation: simPulse 1.6s ease-in-out infinite; }
          .sim-flow { stroke-dasharray: 6 6; animation: simDash 1s linear infinite; }
        `}</style>
        <defs>
          <pattern id="simDots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--border)" opacity="0.5" />
          </pattern>
          <filter id="simGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="var(--destructive)" floodOpacity="0.55" />
          </filter>
        </defs>

        <rect x="0" y="0" width={layout.width} height={layout.height} fill="url(#simDots)" />

        <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`}>
          {/* base edges */}
          {graph.edges.map((e, i) => {
            const a = layout.pos.get(e.from);
            const b = layout.pos.get(e.to);
            if (!a || !b) return null;
            return <path key={`b${i}`} d={edgePath(a, b)} fill="none" stroke="var(--border)" strokeWidth={1.25} strokeOpacity={0.5} />;
          })}

          {/* revealed affected edges (flowing) */}
          {revealed && graph.edges.map((e, i) => {
            const a = layout.pos.get(e.from);
            const b = layout.pos.get(e.to);
            if (!a || !b) return null;
            if (!(affectedSet.has(e.from) && affectedSet.has(e.to))) return null;
            const delay = Math.max(waves.get(e.from) ?? 0, waves.get(e.to) ?? 0) * WAVE_MS;
            return (
              <g key={`f${i}`} className="sim-reveal" style={{ animationDelay: `${delay}ms` }}>
                <path d={edgePath(a, b)} fill="none" stroke="var(--destructive)" strokeWidth={2.25} strokeOpacity={0.95} className="sim-flow" />
              </g>
            );
          })}

          {/* base nodes */}
          {graph.nodes.map((n) => {
            const p = layout.pos.get(n.id)!;
            const hit = affectedSet.has(n.id);
            const dot = KIND_COLOR[n.kind] ?? 'var(--primary)';
            return (
              <g key={n.id}>
                <rect
                  x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={11}
                  fill="var(--card)" stroke="var(--border)" strokeWidth={1}
                  opacity={revealed && affected.length && !hit ? 0.4 : 1}
                />
                <circle cx={p.x + 16} cy={p.y + NODE_H / 2} r={5} fill={dot} />
                <text x={p.x + 30} y={p.y + 23} fill="var(--foreground)" fontSize={12.5} fontWeight={600}>{trunc(n.name, 18)}</text>
                <text x={p.x + 30} y={p.y + 40} fill="var(--muted-foreground)" fontSize={10.5}>
                  {n.kind.replace(/_/g, ' ')}{n.redundant ? ' · redundant' : ''}
                </text>
              </g>
            );
          })}

          {/* revealed affected overlays (wave-by-wave) */}
          {revealed && graph.nodes.filter((n) => affectedSet.has(n.id)).map((n) => {
            const p = layout.pos.get(n.id)!;
            const epi = epicenterSet.has(n.id);
            const delay = (waves.get(n.id) ?? 0) * WAVE_MS;
            return (
              <g key={`a${n.id}`} className="sim-reveal" style={{ animationDelay: `${delay}ms` }} filter="url(#simGlow)">
                {epi && (
                  <rect className="sim-ring" x={p.x - 4} y={p.y - 4} width={NODE_W + 8} height={NODE_H + 8} rx={14}
                    fill="none" stroke="var(--destructive)" strokeWidth={2} />
                )}
                <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={11}
                  fill="var(--destructive)" fillOpacity={0.13} stroke="var(--destructive)" strokeWidth={1.5} />
              </g>
            );
          })}
        </g>

        {/* working shimmer while the simulation runs */}
        {!revealed && (
          <rect x="0" y="0" width={layout.width} height={layout.height}
            fill="var(--primary)" style={{ animation: 'simScan 1.1s ease-in-out infinite' }} opacity={0.08} />
        )}
      </svg>
    </div>
  );
}

function CtrlBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
      {children}
    </button>
  );
}

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function buildLayout(graph: SystemGraph) {
  const depth = computeDepths(graph);
  const columns = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [col, ids] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    ids.forEach((id, i) => {
      pos.set(id, { x: PAD + col * (NODE_W + COL_GAP), y: PAD + i * (NODE_H + ROW_GAP) });
    });
  }
  const maxCol = Math.max(0, ...[...columns.keys()]);
  const maxRows = Math.max(1, ...[...columns.values()].map((v) => v.length));
  return {
    pos,
    width: PAD * 2 + maxCol * (NODE_W + COL_GAP) + NODE_W,
    height: PAD * 2 + (maxRows - 1) * (NODE_H + ROW_GAP) + NODE_H,
  };
}

/** Reveal order: BFS hops from the epicenter, downstream first then undirected. */
function computeWaves(graph: SystemGraph, affected: string[], epicenter: string[]): Map<string, number> {
  const set = new Set(affected);
  const out = new Map<string, string[]>();
  const both = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (set.has(e.from) && set.has(e.to)) {
      out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
      both.set(e.from, [...(both.get(e.from) ?? []), e.to]);
      both.set(e.to, [...(both.get(e.to) ?? []), e.from]);
    }
  }
  const wave = new Map<string, number>();
  const seeds = epicenter.filter((id) => set.has(id));
  const queue = seeds.length ? [...seeds] : affected.slice(0, 1);
  queue.forEach((id) => wave.set(id, 0));
  // directed pass
  let i = 0;
  while (i < queue.length) {
    const id = queue[i++];
    for (const nx of out.get(id) ?? []) {
      if (!wave.has(nx)) { wave.set(nx, (wave.get(id) ?? 0) + 1); queue.push(nx); }
    }
  }
  // undirected pass for anything not yet reached
  while (i < queue.length || affected.some((id) => !wave.has(id))) {
    if (i >= queue.length) {
      const next = affected.find((id) => !wave.has(id));
      if (next === undefined) break;
      wave.set(next, (Math.max(0, ...[...wave.values()])) + 1);
      queue.push(next);
    }
    const id = queue[i++];
    for (const nx of both.get(id) ?? []) {
      if (!wave.has(nx)) { wave.set(nx, (wave.get(id) ?? 0) + 1); queue.push(nx); }
    }
  }
  return wave;
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
  graph.nodes.forEach((n) => { if (!depth.has(n.id)) depth.set(n.id, 0); });
  return depth;
}
