import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
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
    <section
      className={`rounded-xl border border-border bg-panel p-5 ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-bad/20 text-bad border-bad/40',
  high: 'bg-warn/20 text-warn border-warn/40',
  medium: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.low;
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {severity}
    </span>
  );
}

export function ScoreGauge({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const color =
    score >= 80 ? 'text-good' : score >= 60 ? 'text-warn' : 'text-bad';
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`text-5xl font-bold ${color}`}>{score}</div>
      <div className="text-xs text-muted">/ 100 · {label}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-panel2 px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
