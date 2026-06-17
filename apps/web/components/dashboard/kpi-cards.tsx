'use client';

import {
  Activity, ShieldCheck, TrendingDown, Percent, AlertTriangle, Clock, ArrowUp, ArrowDown,
  type LucideIcon,
} from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';
import { money } from '@/lib/dashboard-data';
import { Sparkline, trendTo } from '@/components/ui/sparkline';

interface Kpi {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend: number[];
  delta?: { value: string; good: boolean };
}

export function KpiCards() {
  const d = useDashboard();
  const c = d.currency;

  const kpis: Kpi[] = [
    {
      label: 'Reliability Score',
      value: `${d.reliability.score}`,
      icon: Activity,
      color: d.reliability.score >= 75 ? 'var(--risk-ok)' : 'var(--risk-medium)',
      trend: trendTo(d.reliability.score),
      delta: { value: `${Math.abs(d.reliability.delta)} pts`, good: d.reliability.delta >= 0 },
    },
    {
      label: 'Security Score',
      value: `${d.security.score}`,
      icon: ShieldCheck,
      color: d.security.score >= 75 ? 'var(--risk-ok)' : 'var(--risk-high)',
      trend: trendTo(d.security.score),
    },
    {
      label: 'Revenue at Risk',
      value: money(d.worstRevenue, c),
      icon: TrendingDown,
      color: 'var(--risk-critical)',
      trend: trendTo(Math.max(1, d.worstRevenue)),
      delta: { value: 'worst event', good: false },
    },
    {
      label: 'Failure Probability',
      value: `${d.failureProbability}%`,
      icon: Percent,
      color: 'var(--risk-high)',
      trend: trendTo(d.failureProbability),
    },
    {
      label: 'Critical Risks',
      value: `${d.criticalRisks}`,
      icon: AlertTriangle,
      color: d.criticalRisks ? 'var(--risk-critical)' : 'var(--risk-ok)',
      trend: trendTo(Math.max(1, d.criticalRisks), 14, 0.4),
    },
    {
      label: 'Downtime Cost',
      value: money(d.monthlyDowntimeCost, c),
      icon: Clock,
      color: 'var(--risk-critical)',
      trend: trendTo(Math.max(1, d.monthlyDowntimeCost)),
      delta: { value: '/mo est.', good: false },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">{k.label}</span>
              <Icon className="size-4" style={{ color: k.color }} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">{k.value}</div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              {k.delta ? (
                <span
                  className={`flex items-center gap-0.5 text-[11px] ${
                    k.delta.good ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {k.delta.good ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {k.delta.value}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">last 14 scans</span>
              )}
              <Sparkline data={k.trend} color={k.color} width={64} height={22} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
