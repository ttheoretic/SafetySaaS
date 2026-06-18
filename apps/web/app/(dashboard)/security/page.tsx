'use client';

import Link from 'next/link';
import { ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight, Bug } from 'lucide-react';
import { securitySimulation } from '@riscly/shared';
import { PageHeader, ScoreGauge, SeverityBadge } from '@/components/ui';
import { useSystemGraph } from '@/lib/dashboard-store';

const ATTACK_LABEL: Record<string, string> = {
  ddos: 'DDoS / volumetric flood',
  credential_stuffing: 'Credential stuffing',
  api_abuse: 'API abuse',
  rate_limit_bypass: 'Rate-limit bypass',
  brute_force: 'Brute force',
  session_hijacking: 'Session hijacking',
};

export default function SecurityPage() {
  const graph = useSystemGraph();
  const result = securitySimulation(graph);
  const exposed = result.exposures.filter((e) => e.exposed);
  const vulns = graph.vulnerabilities ?? [];
  const critical = [
    ...result.findings.filter((f) => f.severity === 'critical' || f.severity === 'high'),
    ...vulns.filter((v) => v.severity === 'critical' || v.severity === 'high'),
  ];

  return (
    <>
      <PageHeader
        title="Security Posture"
        subtitle="Your live attack surface: which attack classes your architecture is exposed to, and the highest-priority fixes."
      />

      {/* Top row: score gauge + headline counters */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-6">
          <ScoreGauge score={result.score} label="security" />
          <p className="mt-2 text-xs text-muted-foreground">Weighted across all attack classes</p>
        </section>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Kpi
            icon={<ShieldAlert className="size-5 text-destructive" />}
            value={exposed.length}
            label="Exposed attack vectors"
            tone="bad"
          />
          <Kpi
            icon={<AlertTriangle className="size-5 text-warning" />}
            value={critical.length}
            label="High / critical findings"
            tone="warn"
          />
          <Kpi
            icon={<ShieldCheck className="size-5 text-success" />}
            value={result.exposures.length - exposed.length}
            label="Vectors protected"
            tone="good"
          />
          <Link
            href="/simulations"
            className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
          >
            <span className="text-sm font-medium text-foreground">Run an attack simulation</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
              Simulations <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>

      {/* Attack surface matrix */}
      <section className="mt-6 rounded-xl border border-border bg-surface">
        <header className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Attack surface</h2>
        </header>
        <ul className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
          {result.exposures.map((e) => (
            <li key={e.attack} className="flex items-start justify-between gap-3 bg-surface px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {ATTACK_LABEL[e.attack] ?? e.attack.replace(/_/g, ' ')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{e.reason}</p>
              </div>
              <span
                className={
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
                  (e.exposed
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-success/15 text-success')
                }
              >
                {e.exposed ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                {e.exposed ? 'Exposed' : 'Protected'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Dependency vulnerabilities (SCA from the connected repo's lockfiles) */}
      <section className="mt-6 rounded-xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bug className="size-4 text-muted-foreground" /> Dependency vulnerabilities
          </h2>
          <span className="text-xs text-muted-foreground">{vulns.length} found</span>
        </header>
        <ul className="divide-y divide-border">
          {vulns.map((v, i) => (
            <li key={`${v.id}-${v.package}-${i}`} className="px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium text-foreground">
                  {v.package}@{v.version}
                </span>
                <SeverityBadge severity={v.severity} />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{v.summary}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono">{v.id}</span>
                {v.fixedVersion ? (
                  <span className="text-success">Fixed in {v.fixedVersion}</span>
                ) : (
                  <span className="text-warning">No fix published</span>
                )}
                <span className="opacity-70">{v.repo}</span>
              </div>
            </li>
          ))}
          {vulns.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">
              No known dependency vulnerabilities — or connect a GitHub repo and run a scan to check
              your lockfiles against the OSV advisory database.
            </li>
          )}
        </ul>
      </section>

      {/* Prioritized findings */}
      <section className="mt-6 rounded-xl border border-border bg-surface">
        <header className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Security findings</h2>
        </header>
        <ul className="divide-y divide-border">
          {result.findings.map((f, i) => (
            <li key={i} className="px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{f.title}</span>
                <SeverityBadge severity={f.severity} />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.description}</p>
            </li>
          ))}
          {result.findings.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">
              No security findings — your modeled system is well protected.
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

function Kpi({
  icon, value, label, tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: 'good' | 'bad' | 'warn';
}) {
  const ring =
    tone === 'bad' ? 'bg-destructive/10' : tone === 'warn' ? 'bg-warning/10' : 'bg-success/10';
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className={'flex size-9 items-center justify-center rounded-lg ' + ring}>{icon}</div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
