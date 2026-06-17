'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, ShieldCheck, ShieldAlert, ScanLine, Radar, Clock, AlertTriangle,
  Boxes, ArrowUpRight, Circle,
} from 'lucide-react';
import { MONITORING_LABEL } from '@riscly/shared';
import { useDashboard, useDashboardStore } from '@/lib/dashboard-store';
import { usePlan } from '@/lib/use-plan';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { SystemDiagram } from './system-diagram';

function timeAgo(iso?: string): string {
  if (!iso) return 'No scans yet';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(4, value)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right font-mono tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Tile({
  icon: Icon, label, value, sub, tone = 'text-primary',
}: {
  icon: typeof Activity; label: string; value: React.ReactNode; sub?: string; tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className={`size-3.5 ${tone}`} /> {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Overview() {
  const d = useDashboard();
  const source = useDashboardStore((s) => s.source);
  const { plan, limits, usage } = usePlan();
  const { token } = useAuth();

  const projects = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, enabled: Boolean(token) });
  const firstId = projects.data?.[0]?.id;
  const scans = useQuery({
    queryKey: ['scans', firstId],
    queryFn: () => api.listScans(firstId!),
    enabled: Boolean(firstId),
  });
  const lastScan = scans.data?.find((s) => s.status === 'succeeded');

  const risky = new Set(d.topFindings.filter((f) => f.nodeId).map((f) => f.nodeId as string));
  const securityFindings = d.vulnerabilities.filter((v) => v.kind === 'security');
  const healthy = d.reliability.score >= 75 && d.criticalRisks === 0;
  const maxScans = limits.maxScansPerDay;
  const scanPct = Number.isFinite(maxScans) ? Math.min(100, Math.round((usage.scansToday / maxScans) * 100)) : 0;
  const planName = plan[0].toUpperCase() + plan.slice(1);

  return (
    <div className="space-y-6">
      {/* Header — project identity + health, à la Supabase Project Overview */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{source}</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                healthy
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-warning/30 bg-warning/10 text-warning'
              }`}
            >
              <Circle className={`size-2 ${healthy ? 'fill-primary text-primary' : 'fill-warning text-warning'}`} />
              {healthy ? 'Healthy' : 'At risk'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {planName} plan · {MONITORING_LABEL[limits.monitoring]} monitoring · Production
          </p>
        </div>
        <Link
          href="/architecture"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-primary"
        >
          <Boxes className="size-4 text-primary" /> Full architecture <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {/* Status tiles (left) + live module diagram panel (right) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="grid grid-cols-2 gap-3 self-start">
          <Tile
            icon={healthy ? ShieldCheck : ShieldAlert}
            label="Status"
            value={healthy ? 'Operational' : 'Needs attention'}
            tone={healthy ? 'text-primary' : 'text-warning'}
          />
          <Tile icon={Activity} label="Reliability" value={`${d.reliability.score}/100`} sub={`Grade ${d.reliability.grade}`} />
          <Tile
            icon={ScanLine}
            label="Scans today"
            value={`${usage.scansToday} / ${Number.isFinite(maxScans) ? maxScans : '∞'}`}
            sub="Resets daily"
          />
          <Tile icon={Radar} label="Monitoring" value={MONITORING_LABEL[limits.monitoring]} sub={`${planName} plan`} />
          <Tile icon={Clock} label="Last scan" value={timeAgo(lastScan?.createdAt)} />
          <Tile
            icon={AlertTriangle}
            label="Critical risks"
            value={String(d.criticalRisks)}
            tone={d.criticalRisks ? 'text-destructive' : 'text-primary'}
          />
        </div>

        {/* The "rectangle on the right" — system modules, live. */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/30">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Boxes className="size-4 text-primary" /> System Modules
              <span className="text-xs text-muted-foreground">· {d.systemGraph.nodes.length} components</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Live
            </span>
          </div>

          <div className="p-4">
            <SystemDiagram graph={d.systemGraph} risky={risky} />
          </div>

          {/* Live metrics footer — echoes Supabase's compute card readout. */}
          <div className="grid gap-2 border-t border-border/60 px-4 py-3 sm:grid-cols-2">
            <Bar label="Reliability" value={d.reliability.score} tone={d.reliability.score >= 75 ? 'bg-primary' : 'bg-warning'} />
            <Bar label="Security" value={d.security.score} tone={d.security.score >= 75 ? 'bg-primary' : 'bg-warning'} />
            <Bar label="Scan quota" value={scanPct} tone="bg-chart-2" />
            <Bar
              label="Risk load"
              value={Math.min(100, d.failureProbability)}
              tone={d.failureProbability >= 50 ? 'bg-destructive' : 'bg-warning'}
            />
          </div>
        </div>
      </div>

      {/* Live monitoring over modules + security risks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Radar className="size-4 text-primary" /> Live Monitoring
            </div>
            <span className="text-xs text-muted-foreground">{MONITORING_LABEL[limits.monitoring]} checks</span>
          </div>
          <ul className="divide-y divide-border/60">
            {d.systemGraph.nodes.map((n) => {
              const hit = risky.has(n.id);
              return (
                <li key={n.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Circle className={`size-2 ${hit ? 'fill-destructive text-destructive' : 'fill-primary text-primary'}`} />
                    <span className="text-sm text-foreground">{n.name}</span>
                    <span className="text-[11px] text-muted-foreground">{n.kind}</span>
                  </div>
                  <span className={`text-xs ${hit ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {hit ? 'At risk' : 'Operational'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldAlert className="size-4 text-destructive" /> Security Risks
            </div>
            <span className="text-xs text-muted-foreground">{d.security.score}/100 posture</span>
          </div>
          <ul className="divide-y divide-border/60">
            {(securityFindings.length ? securityFindings : d.vulnerabilities).slice(0, 7).map((v, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{v.title}</p>
                  <p className="text-[11px] text-muted-foreground">{v.location}</p>
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${
                    v.severity === 'critical' || v.severity === 'high'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-warning/30 bg-warning/10 text-warning'
                  }`}
                >
                  {v.severity}
                </span>
              </li>
            ))}
            {!d.vulnerabilities.length && (
              <li className="px-5 py-6 text-center text-sm text-muted-foreground">No security risks detected.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
