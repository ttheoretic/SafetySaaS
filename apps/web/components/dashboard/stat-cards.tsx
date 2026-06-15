import { Activity, ShieldAlert, AlertTriangle, ServerCrash } from 'lucide-react';
import { stats } from '@/lib/dashboard-data';

const ICONS = [Activity, ShieldAlert, AlertTriangle, ServerCrash];
const TONE: Record<string, string> = {
  good: 'text-primary',
  warn: 'text-warning',
  bad: 'text-destructive',
};

export function StatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s, i) => {
        const Icon = ICONS[i];
        return (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <Icon className={`size-4 ${TONE[s.tone]}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
