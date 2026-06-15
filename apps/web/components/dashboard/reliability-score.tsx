'use client';

import { TrendingDown, Activity } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';

function Gauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const arc = 0.75; // 270° arc
  const dash = circumference * arc;
  const progress = dash * (score / 100);

  return (
    <div className="relative flex size-44 items-center justify-center">
      <svg viewBox="0 0 180 180" className="size-full -rotate-[135deg]">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--primary)" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${progress} ${circumference}`} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-5xl font-semibold tabular-nums text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">Reliability Score</span>
      </div>
    </div>
  );
}

export function ReliabilityScore() {
  const { reliability } = useDashboard();
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Activity className="size-4 text-primary" />
          System Reliability
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
          Grade {reliability.grade}
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center">
        <Gauge score={reliability.score} />
        <div className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
          <TrendingDown className="size-4" />
          <span className="font-medium tabular-nums">{reliability.delta} pts</span>
          <span className="text-muted-foreground">this week</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Forecast uptime <span className="font-mono text-foreground">{reliability.uptimeForecast}%</span>
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {reliability.components.map((c) => (
          <div key={c.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-mono tabular-nums text-foreground">{c.value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${c.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
