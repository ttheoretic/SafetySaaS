'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck, AlertTriangle, Crosshair, RotateCw, Loader2 } from 'lucide-react';
import { SeverityBadge } from '@/components/ui';
import { SimulationMap } from '@/components/simulations/simulation-map';
import { runScenarioById, type SimView } from '@/lib/simulations';
import { useSystemGraph, useBusiness } from '@/lib/dashboard-store';

export default function RunSimulationPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <RunSimulation />
    </Suspense>
  );
}

const RUN_MS = 2400;

const STEPS: Record<string, string[]> = {
  attack: ['Mapping attack surface', 'Launching attack', 'Probing entrypoints', 'Propagating through services', 'Assessing blast radius'],
  failure: ['Mapping dependencies', 'Injecting fault', 'Propagating failure', 'Computing revenue impact', 'Finalizing report'],
  growth: ['Modeling current load', 'Applying traffic surge', 'Finding bottlenecks', 'Propagating saturation', 'Computing impact'],
};

function RunSimulation() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const graph = useSystemGraph();
  const business = useBusiness();
  const view = useMemo(() => runScenarioById(id, graph, business), [id, graph, business]);

  const [runKey, setRunKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    setDone(false);
    setProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / RUN_MS);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [id, runKey]);

  if (!view) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">That simulation could not be found.</p>
        <Link href="/simulations" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary">
          <ArrowLeft className="size-4" /> Back to simulations
        </Link>
      </div>
    );
  }

  const nameOf = (nid: string) => graph.nodes.find((n) => n.id === nid)?.name ?? nid;
  const steps = STEPS[view.groupKey] ?? STEPS.failure;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/simulations" className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{view.groupTitle}</p>
            <h2 className="text-lg font-semibold text-foreground">{view.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {done && (
            <button
              onClick={() => setRunKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              <RotateCw className="size-3.5" /> Re-run
            </button>
          )}
          {done && (
            <span className={'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ' +
              (view.statusGood ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
              {view.statusGood ? <ShieldCheck className="size-4" /> : <AlertTriangle className="size-4" />}
              {view.status}
            </span>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: running progress, then data */}
        <div className="space-y-5 overflow-y-auto pr-1 lg:col-span-2">
          {!done ? (
            <RunningPanel progress={progress} steps={steps} />
          ) : (
            <DataPanel view={view} nameOf={nameOf} />
          )}
        </div>

        {/* Right: standalone, pannable architecture map */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/20 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[13px] font-medium text-foreground">
              {done ? 'Impact map' : 'Running simulation…'}
            </span>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-destructive bg-destructive/30" /> affected</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-border bg-card" /> unaffected</span>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <SimulationMap graph={graph} affected={view.affectedIds} epicenter={view.epicenterIds} revealed={done} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RunningPanel({ progress, steps }: { progress: number; steps: string[] }) {
  const pct = Math.round(progress * 100);
  const activeStep = Math.min(steps.length - 1, Math.floor(progress * steps.length));
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Running simulation…</h3>
        <span className="ml-auto text-sm font-medium tabular-nums text-muted-foreground">{pct}%</span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted/30">
        <div className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-5 space-y-2.5">
        {steps.map((s, i) => {
          const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'todo';
          return (
            <li key={s} className="flex items-center gap-2.5 text-[13px]">
              <span className={
                'flex size-4 items-center justify-center rounded-full border text-[9px] ' +
                (state === 'done' ? 'border-success bg-success text-background'
                  : state === 'active' ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground')
              }>
                {state === 'done' ? '✓' : state === 'active' ? '•' : ''}
              </span>
              <span className={state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}>{s}</span>
              {state === 'active' && <Loader2 className="size-3 animate-spin text-primary" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DataPanel({ view, nameOf }: { view: SimView; nameOf: (id: string) => string }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
        <Stat label="Severity"><SeverityBadge severity={view.severity} /></Stat>
        <Stat label="Blast radius"><span className="text-sm font-semibold text-foreground">{Math.round(view.blastRadius * 100)}%</span></Stat>
        {view.revenue && <Stat label="Revenue at risk"><span className="text-sm font-semibold text-destructive">{view.revenue}</span></Stat>}
        <Stat label="Services hit"><span className="text-sm font-semibold text-foreground">{view.affectedIds.length}</span></Stat>
      </div>

      {view.vector && <Block title="Attack vector"><p className="text-[13px] text-foreground">{view.vector}</p></Block>}
      <Block title="What happens"><p className="text-[13px] leading-relaxed text-foreground">{view.narrative}</p></Block>

      {view.affectedIds.length > 0 && (
        <Block title="Affected services">
          <div className="flex flex-wrap gap-1.5">
            {view.affectedIds.map((nid) => (
              <span key={nid} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[12px] text-foreground">
                {view.epicenterIds.includes(nid) && <Crosshair className="size-3 text-destructive" />}
                {nameOf(nid)}
              </span>
            ))}
          </div>
        </Block>
      )}

      <Block title="Recommended mitigations">
        <ul className="space-y-1.5">
          {view.bullets.map((m) => (
            <li key={m} className="flex gap-2 text-[13px] text-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />{m}
            </li>
          ))}
        </ul>
      </Block>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
