'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Zap, Database, CreditCard, Cloud, AlertTriangle } from 'lucide-react';
import {
  simulateFailure,
  revenueImpact,
  exampleGraph,
  exampleBusiness,
  SimulationType,
} from '@riscly/shared';
import { cn } from '@/lib/utils';

const SCENARIOS: { id: string; label: string; type: SimulationType; icon: typeof Zap; hours: number }[] = [
  { id: 'spike', label: '100× Traffic Spike', type: 'traffic_100x', icon: Zap, hours: 1 },
  { id: 'db', label: 'Primary DB Outage', type: 'db_lock', icon: Database, hours: 3 },
  { id: 'stripe', label: 'Payments Provider Down', type: 'stripe_down', icon: CreditCard, hours: 24 },
  { id: 'region', label: 'Cloud Region Failure', type: 'infra_region', icon: Cloud, hours: 4 },
];

const byId = new Map(exampleGraph.nodes.map((n) => [n.id, n.name]));
function money(n: number) {
  return new Intl.NumberFormat('en', { style: 'currency', currency: exampleBusiness.currency ?? 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function SimulationDemo() {
  const [activeId, setActiveId] = useState('db');
  const active = SCENARIOS.find((s) => s.id === activeId)!;

  const { sim, rev } = useMemo(() => {
    const sim = simulateFailure(exampleGraph, active.type);
    const rev = revenueImpact(sim, exampleBusiness, active.hours);
    return { sim, rev };
  }, [active]);

  const severity = sim.fullOutage || sim.impact === 'partial_outage' ? 'critical' : 'warning';
  const affectedNames = sim.affectedNodeIds.map((id) => byId.get(id) ?? id);

  return (
    <section id="simulation" className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Failure simulation</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Break things on purpose. Safely.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Pick a failure scenario and watch Riscly trace the blast radius across your stack in
            seconds — no production traffic harmed. This demo runs the real engine.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {SCENARIOS.map((s) => {
              const selected = s.id === active.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'border-border/60 bg-card hover:border-border',
                  )}
                >
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground')}>
                    <s.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{s.label}</div>
                    <div className="text-xs capitalize text-muted-foreground">{sim && s.id === active.id ? sim.impact.replace('_', ' ') : `${s.hours}h window`}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 lg:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={cn('flex size-9 items-center justify-center rounded-lg', severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning')}>
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <div className="text-sm text-muted-foreground">Simulating</div>
                  <div className="font-medium text-foreground">{active.label}</div>
                </div>
              </div>
              <span className={cn('rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide', severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning')}>
                {severity}
              </span>
            </div>

            <div className="mt-6">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Affected services ({affectedNames.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {affectedNames.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No exposure for this scenario.</span>
                ) : affectedNames.map((a) => (
                  <span key={a} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm text-foreground">{a}</span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-6">
              <div>
                <div className="text-xs text-muted-foreground">Revenue at risk · {active.hours}h</div>
                <div className="mt-1 font-mono text-xl font-semibold text-destructive">{money(rev.totalImpact)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Blast radius</div>
                <div className="mt-1 font-mono text-xl font-semibold text-foreground">{Math.round(sim.blastRadius * 100)}% of system</div>
              </div>
            </div>

            <Link href="/get-started" className="mt-6 flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Run a full simulation on your stack
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
