'use client';

import { Radio } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';
import { severityMeta, type Severity } from '@/lib/architecture';

const AGES = ['just now', '2m ago', '6m ago', '14m ago', '31m ago', '1h ago', '2h ago', '4h ago'];

export function LiveRiskFeed() {
  const d = useDashboard();
  const feed = [...d.risks]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 8);

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Radio className="size-4 text-primary" /> Live Risk Feed
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          streaming
        </span>
      </div>

      <ul className="flex-1 divide-y divide-border/60">
        {feed.map((r, i) => {
          const meta = severityMeta[(r.severity as Severity) ?? 'low'];
          return (
            <li key={`${r.title}-${i}`} className="flex items-start gap-3 px-5 py-2.5">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: meta.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{r.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.group}
                  {r.horizon ? ` · ${r.horizon}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{AGES[i % AGES.length]}</span>
            </li>
          );
        })}
        {!feed.length && (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">No active risks. All systems nominal.</li>
        )}
      </ul>
    </section>
  );
}
