import { Beaker, ArrowRight } from 'lucide-react';
import { scenarios, money } from '@/lib/dashboard-data';

const IMPACT: Record<string, string> = {
  none: 'text-muted-foreground',
  degraded: 'text-warning',
  partial_outage: 'text-warning',
  full_outage: 'text-destructive',
};

export function ScenarioLab() {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Beaker className="size-4 text-primary" />
          Scenario Laboratory
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
          What-if simulations
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Compose outages, surges and business shocks and quantify the combined impact.
      </p>

      <div className="mt-4 grid flex-1 gap-3 sm:grid-cols-3">
        {scenarios.map((s) => (
          <div key={s.name} className="flex flex-col rounded-lg border border-border bg-background/40 p-4">
            <p className="text-sm font-medium leading-snug text-foreground">{s.name}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">{s.steps} steps</div>
            <div className="mt-auto pt-3">
              <div className={`text-xs font-medium capitalize ${IMPACT[s.worstImpact] ?? IMPACT.none}`}>
                {s.worstImpact.replace('_', ' ')}
              </div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-destructive">
                {money(s.loss)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <a href="/scenarios" className="mt-4 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        Open the lab <ArrowRight className="size-3.5" />
      </a>
    </section>
  );
}
