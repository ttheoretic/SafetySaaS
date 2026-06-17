'use client';

import { Wrench, ArrowDownRight } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';

const PRIORITY: Record<string, string> = {
  critical: 'border-destructive/30 bg-destructive/10 text-destructive',
  high: 'border-warning/30 bg-warning/10 text-warning',
  medium: 'border-border bg-secondary text-muted-foreground',
  low: 'border-border bg-secondary text-muted-foreground',
};

export function RecommendedFixes() {
  const d = useDashboard();
  const fixes = d.recommendations;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Wrench className="size-4 text-primary" /> Recommended Fixes
        </div>
        <span className="text-[11px] text-muted-foreground">ranked by impact</span>
      </div>

      <ul className="divide-y divide-border/60 pb-1">
        {fixes.map((f, i) => (
          <li key={i} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase ${
                  PRIORITY[f.priority] ?? PRIORITY.medium
                }`}
              >
                {f.priority}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.fix}</p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-primary">
                <ArrowDownRight className="size-3" /> -{f.riskReductionPct}% risk
              </span>
              <span>·</span>
              <span className="truncate">{f.businessImpact}</span>
            </div>
          </li>
        ))}
        {!fixes.length && (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">No fixes needed right now. 🎉</li>
        )}
      </ul>
    </section>
  );
}
