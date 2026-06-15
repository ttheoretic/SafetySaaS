import { ShieldAlert } from 'lucide-react';
import { vulnerabilities } from '@/lib/dashboard-data';

const SEV: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-warning/15 text-warning border-warning/30',
  medium: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  low: 'bg-secondary text-muted-foreground border-border',
};

export function Vulnerabilities() {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldAlert className="size-4 text-primary" />
        Risk Findings
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Reliability and security findings detected in the latest scan.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {vulnerabilities.map((v, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{v.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {v.kind} · {v.location}
              </p>
            </div>
            <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${SEV[v.severity] ?? SEV.low}`}>
              {v.severity}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
