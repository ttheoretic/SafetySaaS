'use client';

import { useState } from 'react';
import {
  Swords, ServerCrash, TrendingUp, Loader2, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import {
  simulateFailure, revenueImpact, attackSimulation, exampleGraph, exampleBusiness,
  type SimulationType, type SimulationParams, type AttackSimType, type Impact,
} from '@riscly/shared';
import { PageHeader, SeverityBadge } from '@/components/ui';
import { SystemGraphView } from '@/components/SystemGraphView';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface SimButton {
  label: string;
  /** Failure / growth scenarios map to the failure engine. */
  sim?: { type: SimulationType; params?: SimulationParams; durationHours?: number };
  /** Attack scenarios map to the attack engine. */
  attack?: AttackSimType;
}

interface Group {
  key: string;
  title: string;
  description: string;
  icon: typeof Swords;
  buttons: SimButton[];
}

const GROUPS: Group[] = [
  {
    key: 'attack',
    title: 'Attack Simulation',
    description: 'Probe how a real attacker would reach your system — and what would contain them.',
    icon: Swords,
    buttons: [
      { label: 'DDoS', attack: 'ddos' },
      { label: 'API Abuse', attack: 'api_abuse' },
      { label: 'Credential Leak', attack: 'credential_leak' },
      { label: 'GitHub Token Leak', attack: 'github_token_leak' },
      { label: 'JWT Secret Leak', attack: 'jwt_secret_leak' },
    ],
  },
  {
    key: 'failure',
    title: 'Failure Simulation',
    description: 'Knock out a dependency and measure the blast radius and revenue at risk.',
    icon: ServerCrash,
    buttons: [
      { label: 'Database Failure', sim: { type: 'db_lock' } },
      { label: 'Redis Failure', sim: { type: 'cache' } },
      { label: 'Stripe Outage', sim: { type: 'stripe_down' } },
      { label: 'DNS Failure', sim: { type: 'dns' } },
      { label: 'Cloud Outage', sim: { type: 'aws_down' } },
    ],
  },
  {
    key: 'growth',
    title: 'Growth Simulation',
    description: 'Stress the system with traffic surges to find the scaling cliffs before customers do.',
    icon: TrendingUp,
    buttons: [
      { label: '10x Traffic', sim: { type: 'traffic_10x' } },
      { label: '100x Traffic', sim: { type: 'traffic_100x' } },
      { label: 'Black Friday', sim: { type: 'traffic_100x', params: { multiplier: 50 }, durationHours: 8 } },
      { label: 'Viral Growth', sim: { type: 'viral_peak' } },
    ],
  },
];

const IMPACT_SEVERITY: Record<Impact, Severity> = {
  none: 'low',
  degraded: 'medium',
  partial_outage: 'high',
  full_outage: 'critical',
};

const IMPACT_LABEL: Record<Impact, string> = {
  none: 'No impact',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  full_outage: 'Full outage',
};

interface SimView {
  group: string;
  title: string;
  status: string;
  statusGood: boolean;
  severity: Severity;
  blastRadius: number;
  affectedIds: string[];
  vector?: string;
  narrative: string;
  bullets: string[];
  revenue?: string;
}

function money(n: number) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: exampleBusiness.currency ?? 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function nameOf(id: string) {
  return exampleGraph.nodes.find((n) => n.id === id)?.name ?? id;
}

function runButton(group: string, b: SimButton): SimView {
  if (b.attack) {
    const r = attackSimulation(exampleGraph, b.attack);
    return {
      group,
      title: b.label,
      status: r.exposed ? 'Exposed' : 'Protected',
      statusGood: !r.exposed,
      severity: r.severity,
      blastRadius: r.blastRadius,
      affectedIds: r.affectedNodeIds,
      vector: r.vector,
      narrative: r.summary,
      bullets: r.mitigations,
    };
  }
  const { type, params, durationHours } = b.sim!;
  const result = simulateFailure(exampleGraph, type, params);
  const rev = revenueImpact(result, exampleBusiness, durationHours ?? 1);
  return {
    group,
    title: b.label,
    status: IMPACT_LABEL[result.impact],
    statusGood: result.impact === 'none',
    severity: IMPACT_SEVERITY[result.impact],
    blastRadius: result.blastRadius,
    affectedIds: result.affectedNodeIds,
    narrative: result.narrative,
    bullets: result.mitigations,
    revenue: money(rev.totalImpact),
  };
}

export default function SimulationsPage() {
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<SimView | null>(null);
  const [busy, setBusy] = useState(false);

  function run(group: string, b: SimButton) {
    const id = `${group}:${b.label}`;
    setActive(id);
    setBusy(true);
    // Tiny delay so the run reads as an action, not an instant flip.
    setTimeout(() => {
      setView(runButton(group, b));
      setBusy(false);
    }, 280);
  }

  return (
    <>
      <PageHeader
        title="Simulations"
        subtitle="Generate artificial scenarios — attacks, failures and growth surges — and see exactly how your system holds up."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            return (
              <section key={g.key} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{g.title}</h2>
                    <p className="text-xs text-muted-foreground">{g.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {g.buttons.map((b) => {
                    const id = `${g.key}:${b.label}`;
                    const isActive = active === id;
                    return (
                      <button
                        key={b.label}
                        onClick={() => run(g.key, b)}
                        className={
                          'rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ' +
                          (isActive
                            ? 'border-primary bg-primary/15 text-foreground'
                            : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5')
                        }
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Result panel */}
        <div className="xl:sticky xl:top-4">
          <ResultPanel view={view} busy={busy} />
        </div>
      </div>
    </>
  );
}

function ResultPanel({ view, busy }: { view: SimView | null; busy: boolean }) {
  if (busy) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-surface text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Running simulation…
      </div>
    );
  }
  if (!view) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/50 text-center">
        <Swords className="size-6 text-muted-foreground" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Pick a scenario on the left to simulate it against your system model.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{view.group} simulation</p>
          <h2 className="text-base font-semibold text-foreground">{view.title}</h2>
        </div>
        <span
          className={
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
            (view.statusGood
              ? 'bg-success/15 text-success'
              : 'bg-destructive/15 text-destructive')
          }
        >
          {view.statusGood ? <ShieldCheck className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {view.status}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-border">
        <Stat label="Severity">
          <SeverityBadge severity={view.severity} />
        </Stat>
        <Stat label="Blast radius">
          <span className="text-sm font-semibold text-foreground">
            {Math.round(view.blastRadius * 100)}%
          </span>
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

      <div className="space-y-4 p-5">
        {view.vector && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Attack vector</p>
            <p className="mt-1 text-[13px] text-foreground">{view.vector}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground">What happens</p>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground">{view.narrative}</p>
        </div>

        {view.affectedIds.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Affected services</p>
            <div className="flex flex-wrap gap-1.5">
              {view.affectedIds.map((id) => (
                <span key={id} className="rounded-md border border-border bg-card px-2 py-1 text-[12px] text-foreground">
                  {nameOf(id)}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <SystemGraphView graph={exampleGraph} affected={view.affectedIds} />
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Recommended mitigations</p>
          <ul className="space-y-1.5">
            {view.bullets.map((m) => (
              <li key={m} className="flex gap-2 text-[13px] text-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-5 py-3.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
