'use client';

import { Sparkles } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';

export function AiRiskSummary() {
  const { aiInsights } = useDashboard();

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" /> AI Risk Summary
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          Updated live
        </span>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        {aiInsights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-snug text-foreground">{insight.title}</p>
              <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-medium text-primary">
                {insight.impact}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{insight.detail}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1 w-20 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${insight.confidence}%` }} />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{insight.confidence}% conf.</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">{insight.horizon}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
