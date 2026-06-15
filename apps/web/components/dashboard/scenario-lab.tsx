'use client';

import { useMemo, useState } from 'react';
import { FlaskConical, Play, Users, Gauge, Zap, Loader2 } from 'lucide-react';
import {
  simulateFailure,
  revenueImpact,
  exampleGraph,
  exampleBusiness,
  Impact,
  SimulationType,
} from '@failsafe/shared';

type Kind = 'outage' | 'traffic' | 'business';

const SCENARIOS: { id: string; name: string; type: SimulationType; kind: Kind }[] = [
  { id: 'dns', name: 'DNS outage', type: 'dns', kind: 'outage' },
  { id: 'db', name: 'Database lock', type: 'db_lock', kind: 'outage' },
  { id: 'stripe', name: 'Stripe down', type: 'stripe_down', kind: 'outage' },
  { id: 'region', name: 'Region failure', type: 'infra_region', kind: 'outage' },
  { id: 'traffic', name: '100× traffic', type: 'traffic_100x', kind: 'traffic' },
  { id: 'churn', name: 'Churn wave', type: 'churn_wave', kind: 'business' },
];

type Severity = 'critical' | 'high' | 'medium' | 'low';
const IMPACT_SEVERITY: Record<Impact, Severity> = {
  full_outage: 'critical',
  partial_outage: 'high',
  degraded: 'medium',
  none: 'low',
};
const sevText: Record<Severity, string> = {
  critical: 'text-destructive',
  high: 'text-warning',
  medium: 'text-chart-3',
  low: 'text-muted-foreground',
};
const sevBar: Record<Severity, string> = {
  critical: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-chart-3',
  low: 'bg-muted-foreground',
};

function money(n: number) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: exampleBusiness.currency ?? 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Map the intensity slider to real engine parameters and run the engine. */
function runScenario(type: SimulationType, kind: Kind, intensity: number) {
  const scale = intensity / 100;
  const durationHours = kind === 'business' ? 1 : Math.max(1, Math.round(1 + scale * 23));
  const multiplier = kind === 'traffic' ? Math.round(10 + scale * 240) : undefined;

  const sim = simulateFailure(exampleGraph, type, { durationHours, multiplier });
  const rev = revenueImpact(sim, exampleBusiness, durationHours);
  const severity = IMPACT_SEVERITY[sim.impact];
  const churnPct = (rev.churnRiskCost / exampleBusiness.monthlyRevenue) * 100;

  return {
    severity,
    blast: Math.round(sim.blastRadius * 100),
    revenueLoss: rev.totalImpact,
    churn: churnPct.toFixed(1),
    durationHours,
    multiplier,
    narrative: sim.narrative,
    mitigation: sim.mitigations[0] ?? 'Add redundancy and a graceful-degradation path for the affected tier.',
  };
}

export function ScenarioLab() {
  const [activeId, setActiveId] = useState('db');
  const [intensity, setIntensity] = useState(70);
  const [hasRun, setHasRun] = useState(false);
  const [running, setRunning] = useState(false);

  const active = SCENARIOS.find((s) => s.id === activeId)!;
  // Live result (recomputed as the slider/scenario change) once a run happened.
  const result = useMemo(
    () => runScenario(active.type, active.kind, intensity),
    [active.type, active.kind, intensity],
  );

  function run() {
    setRunning(true);
    // brief "computing" beat for UX; the engine itself is instant
    window.setTimeout(() => {
      setRunning(false);
      setHasRun(true);
    }, 350);
  }

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FlaskConical className="size-4 text-primary" />
          Scenario Lab
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
          Simulate the future
        </span>
      </div>

      <div className="mt-5 grid flex-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Controls */}
        <div className="flex flex-col">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Failure scenario</p>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  activeId === s.id
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border bg-background/40 text-muted-foreground hover:border-ring/40 hover:text-foreground'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                {active.kind === 'traffic' ? 'Traffic intensity' : 'Outage intensity'}
              </span>
              <span className="font-mono tabular-nums text-foreground">
                {active.kind === 'traffic'
                  ? `${result.multiplier}×`
                  : active.kind === 'business'
                    ? `${intensity}%`
                    : `${result.durationHours}h`}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{result.narrative}</p>
          </div>

          <button
            onClick={run}
            disabled={running}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? 'Simulating…' : hasRun ? 'Re-run simulation' : 'Run simulation'}
          </button>
        </div>

        {/* Results */}
        <div className="rounded-lg border border-border bg-background/40 p-5">
          {!hasRun ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Gauge className="size-7 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                Pick a scenario and intensity,<br />then run the simulation.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Projected outcome</span>
                <span className={`text-xs font-semibold uppercase tracking-wide ${sevText[result.severity]}`}>
                  {result.severity}
                </span>
              </div>

              <div className={`mt-4 space-y-4 ${running ? 'opacity-50' : ''}`}>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="size-3.5" /> Blast radius
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${sevBar[result.severity]}`}
                        style={{ width: `${result.blast}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-sm tabular-nums text-foreground">{result.blast}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Gauge className="size-3.5" /> Revenue at risk
                    </div>
                    <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-destructive">
                      {money(result.revenueLoss)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Users className="size-3.5" /> Churn risk
                    </div>
                    <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-warning">{result.churn}%</p>
                  </div>
                </div>

                <div className="rounded-md border border-dashed border-border p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Recommended mitigation</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground">{result.mitigation}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
