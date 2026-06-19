import { cn } from '@/lib/utils'
import type { Severity, HealthStatus } from '@/lib/riscly-data'

const styles: Record<Severity, { dot: string; chip: string; text: string }> = {
  critical: {
    dot: 'bg-critical',
    chip: 'bg-critical/15 text-critical border-critical/30',
    text: 'text-critical',
  },
  high: {
    dot: 'bg-high',
    chip: 'bg-high/15 text-high border-high/30',
    text: 'text-high',
  },
  medium: {
    dot: 'bg-medium',
    chip: 'bg-medium/15 text-medium border-medium/30',
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
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
        styles[severity].chip,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', styles[severity].dot)} />
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
