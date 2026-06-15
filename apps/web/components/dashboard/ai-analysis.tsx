'use client';

import { Sparkles } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';

export function AiAnalysis() {
  const { aiInsights } = useDashboard();
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" />
          AI Risk Analysis
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
          Updated live
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Predicted bottlenecks and the highest-leverage fixes, ranked by impact.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {aiInsights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-lg border border-border bg-background/40 p-4 transition-colors hover:border-ring/40"
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
