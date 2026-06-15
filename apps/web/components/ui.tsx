import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-6 ${className}`}>
      {title && (
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

const SEVERITY: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-warning/15 text-warning border-warning/30',
  medium: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  low: 'bg-secondary text-muted-foreground border-border',
};

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY[severity] ?? SEVERITY.low;
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}
    >
      {severity}
    </span>
  );
}

export function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? 'text-primary' : score >= 60 ? 'text-warning' : 'text-destructive';
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`font-mono text-5xl font-semibold tabular-nums ${color}`}>{score}</div>
      <div className="mt-1 text-xs text-muted-foreground">/ 100 · {label}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
