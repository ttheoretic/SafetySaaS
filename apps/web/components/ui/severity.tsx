import { cn } from '@/lib/utils'
import type { Severity, HealthStatus } from '@/lib/riscly-data'

// Datadog-style chips: critical/high are solid-filled and unmissable; medium is
// filled amber; low stays quiet so the loud ones keep their meaning.
const styles: Record<Severity, { dot: string; chip: string; text: string }> = {
  critical: {
    dot: 'bg-critical',
    chip: 'bg-critical text-critical-foreground border-transparent',
    text: 'text-critical',
  },
  high: {
    dot: 'bg-high',
    chip: 'bg-high text-high-foreground border-transparent',
    text: 'text-high',
  },
  medium: {
    dot: 'bg-medium',
    chip: 'bg-medium text-medium-foreground border-transparent',
    text: 'text-medium',
  },
  low: {
    dot: 'bg-low',
    chip: 'bg-low/15 text-low border-low/30',
    text: 'text-low',
  },
}

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
        styles[severity].chip,
        className,
      )}
    >
      {severity}
    </span>
  )
}

export function SeverityDot({
  severity,
  className,
}: {
  severity: Severity | 'ok'
  className?: string
}) {
  const color =
    severity === 'ok' ? 'bg-ok' : styles[severity as Severity].dot
  return <span className={cn('size-2 rounded-full', color, className)} />
}

const healthColor: Record<HealthStatus, string> = {
  ok: 'text-ok',
  warn: 'text-medium',
  critical: 'text-critical',
}
const healthBar: Record<HealthStatus, string> = {
  ok: 'bg-ok',
  warn: 'bg-medium',
  critical: 'bg-critical',
}

export function HealthText({ status }: { status: HealthStatus }) {
  return <span className={healthColor[status]} />
}

export { healthColor, healthBar }

type Confidence = 'verified' | 'high' | 'heuristic'
const confidenceStyle: Record<Confidence, { label: string; cls: string; title: string }> = {
  verified: {
    label: 'Verified',
    cls: 'bg-ok/15 text-ok border-ok/30',
    title: 'Read from the live source of truth (cloud/auth API)',
  },
  high: {
    label: 'AST',
    cls: 'bg-primary/15 text-primary border-primary/30',
    title: 'AST/structure-level static analysis (dataflow-aware)',
  },
  heuristic: {
    label: 'Heuristic',
    cls: 'bg-muted text-muted-foreground border-border',
    title: 'Pattern match — may include false positives',
  },
}

/** Shows how trustworthy a finding is: Verified > AST > Heuristic. */
export function ConfidenceBadge({ confidence }: { confidence?: Confidence }) {
  if (!confidence) return null
  const s = confidenceStyle[confidence]
  return (
    <span
      title={s.title}
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
        s.cls,
      )}
    >
      {s.label}
    </span>
  )
}
