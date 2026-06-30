'use client'

import { cn } from '@/lib/utils'
import type { Series } from '@/lib/api'

/** Large KPI card (Linear/Vercel feel). */
export function Kpi({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <span className={cn('text-muted-foreground', accent && 'text-primary')}>{icon}</span>}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-panel', className)}>
      {title && (
        <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

const TONE: Record<string, string> = {
  active: 'bg-ok/15 text-ok',
  operational: 'bg-ok/15 text-ok',
  trialing: 'bg-primary/15 text-primary',
  past_due: 'bg-high/15 text-high',
  canceled: 'bg-destructive/15 text-destructive',
  none: 'bg-muted text-muted-foreground',
  free: 'bg-muted text-muted-foreground',
  unconfigured: 'bg-muted text-muted-foreground',
  open: 'bg-primary/15 text-primary',
  planned: 'bg-muted text-muted-foreground',
  in_progress: 'bg-high/15 text-high',
  completed: 'bg-ok/15 text-ok',
  archived: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium capitalize', TONE[status] ?? 'bg-muted text-muted-foreground')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

/** Minimal area/line chart from a daily series. */
export function LineChart({ data, height = 120, color = 'var(--primary)' }: { data: Series; height?: number; color?: string }) {
  if (!data.length) return <Empty label="No data yet" />
  const w = 600
  const max = Math.max(1, ...data.map((d) => d.value))
  const step = data.length > 1 ? w / (data.length - 1) : w
  const pts = data.map((d, i) => [i * step, height - (d.value / max) * (height - 10) - 4])
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${w} ${height} L 0 ${height} Z`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lc)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function BarChart({ data, height = 120 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return <Empty label="No data yet" />
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t bg-primary/60" style={{ height: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="truncate text-[10px] capitalize text-muted-foreground">{d.label}</span>
          <span className="font-mono text-[10px] tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
      {label}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/60', className)} />
}

export function KpiSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

/** Format a USD amount compactly. */
export function usd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 100 ? 2 : 0 }).format(n)
}

export function relTime(iso?: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400_000)
  if (d > 0) return `${d}d ago`
  const h = Math.floor(diff / 3600_000)
  if (h > 0) return `${h}h ago`
  const m = Math.floor(diff / 60_000)
  return m > 0 ? `${m}m ago` : 'just now'
}
