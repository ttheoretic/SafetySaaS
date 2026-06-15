'use client';

import { useState } from 'react';
import { Crosshair, Wrench, TrendingUp } from 'lucide-react';
import { PageHeader, SeverityBadge } from '@/components/ui';
import { useDashboard } from '@/lib/dashboard-store';
import { money } from '@/lib/dashboard-data';

const GROUPS = ['All', 'Reliability', 'Security', 'Architecture', 'Dependencies', 'AI Forecast'] as const;
const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export default function RiskCenterPage() {
  const { risks, currency, criticalRisks, worstRevenue } = useDashboard();
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('All');

  const filtered = risks
    .filter((r) => group === 'All' || r.group === group)
    .sort((a, b) => (SEV_RANK[b.severity] - SEV_RANK[a.severity]) || (b.financialImpact - a.financialImpact));

  return (
    <>
      <PageHeader
        title="Risk Center"
        subtitle="Every reliability, security, architecture, dependency and AI-forecast risk in one place — ranked by severity and financial impact."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Total risks" value={String(risks.length)} />
        <Kpi label="Critical + high" value={String(criticalRisks)} tone="bad" />
        <Kpi label="Worst-case exposure" value={money(worstRevenue, currency)} tone="bad" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {GROUPS.map((g) => {
          const count = g === 'All' ? risks.length : risks.filter((r) => r.group === g).length;
          return (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                group === g ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {g} <span className="text-xs text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No risks in this category. 🎉</p>}
        {filtered.map((r, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={r.severity} />
                  <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{r.group}</span>
                  {r.horizon && <span className="text-[11px] text-warning">{r.horizon}</span>}
                </div>
                <h3 className="mt-2 font-medium text-foreground">{r.title}</h3>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <Wrench className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  {r.fix}
                </p>
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-4 text-right">
                <Metric label="Probability" value={`${Math.round(r.probability * 100)}%`} />
                <Metric label="Financial impact" value={money(r.financialImpact, currency)} tone="bad" />
                <Metric label="Improvement" value={r.improvementPct ? `−${r.improvementPct}%` : '—'} tone="good" icon />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${tone === 'bad' ? 'text-destructive' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone?: 'bad' | 'good'; icon?: boolean }) {
  const color = tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-primary' : 'text-foreground';
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 flex items-center justify-end gap-1 font-mono text-sm font-semibold tabular-nums ${color}`}>
        {icon && tone === 'good' && value !== '—' && <TrendingUp className="size-3.5" />}
        {value}
      </div>
    </div>
  );
}
