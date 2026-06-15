'use client';

import { Activity, TrendingDown, AlertTriangle, Percent, ShieldAlert, Clock } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';

const ICONS = [Activity, TrendingDown, AlertTriangle, Percent, ShieldAlert, Clock];
const TONE: Record<string, string> = {
  good: 'text-primary',
  warn: 'text-warning',
  bad: 'text-destructive',
};

export function StatCards() {
  const { stats } = useDashboard();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((s, i) => {
        const Icon = ICONS[i] ?? Activity;
        return (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <Icon className={`size-4 ${TONE[s.tone]}`} />
            </div>
            <div className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground">{s.value}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{s.unit}</div>
          </div>
        );
      })}
    </div>
  );
}
