'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck, AlertTriangle, Crosshair } from 'lucide-react';
import { SeverityBadge } from '@/components/ui';
import { SimulationMap } from '@/components/simulations/simulation-map';
import { runScenarioById, exampleGraph } from '@/lib/simulations';

export default function RunSimulationPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <RunSimulation />
    </Suspense>
  );
}

function RunSimulation() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const view = runScenarioById(id);

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

  const nameOf = (nid: string) => exampleGraph.nodes.find((n) => n.id === nid)?.name ?? nid;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/simulations"
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{view.groupTitle}</p>
            <h2 className="text-lg font-semibold text-foreground">{view.title}</h2>
          </div>
        </div>
        <span
          className={
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ' +
            (view.statusGood ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')
          }
        >
          {view.statusGood ? <ShieldCheck className="size-4" /> : <AlertTriangle className="size-4" />}
          {view.status}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: data */}
        <div className="space-y-5 overflow-y-auto pr-1 lg:col-span-2">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
            <Stat label="Severity"><SeverityBadge severity={view.severity} /></Stat>
            <Stat label="Blast radius">
              <span className="text-sm font-semibold text-foreground">{Math.round(view.blastRadius * 100)}%</span>
            </Stat>
            {view.revenue && (
              <Stat label="Revenue at risk">
                <span className="text-sm font-semibold text-destructive">{view.revenue}</span>
              </Stat>
            )}
            <Stat label="Services hit">
              <span className="text-sm font-semibold text-foreground">{view.affectedIds.length}</span>
            </Stat>
          </div>

          {view.vector && (
            <Block title="Attack vector">
              <p className="text-[13px] text-foreground">{view.vector}</p>
            </Block>
          )}

          <Block title="What happens">
            <p className="text-[13px] leading-relaxed text-foreground">{view.narrative}</p>
          </Block>

          {view.affectedIds.length > 0 && (
            <Block title="Affected services">
              <div className="flex flex-wrap gap-1.5">
                {view.affectedIds.map((nid) => (
                  <span
                    key={nid}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[12px] text-foreground"
                  >
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
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {m}
                </li>
              ))}
            </ul>
          </Block>
        </div>

        {/* Right: standalone architecture map */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/20 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[13px] font-medium text-foreground">Impact map</span>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-destructive bg-destructive/30" /> affected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-border bg-card" /> unaffected
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 p-2">
            <SimulationMap graph={exampleGraph} affected={view.affectedIds} epicenter={view.epicenterIds} />
          </div>
        </div>
      </div>
    </div>
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