'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { useScanHistory } from '@/lib/use-project-data'
import { relativeTime } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

/** Risk posture over time, from the active project's real scan history. */
export function TrendsView() {
  const { points, loading } = useScanHistory()

  const stats = useMemo(() => {
    if (points.length === 0) return null
    const current = points[points.length - 1]
    const first = points[0]
    const delta = current.risk - first.risk
    const best = Math.min(...points.map((p) => p.risk))
    const worst = Math.max(...points.map((p) => p.risk))
    return { current, first, delta, best, worst }
  }, [points])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Trends"
        subtitle="Risk posture over time — from your scan history"
      />

      {points.length < 2 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TrendingUp className={cn('size-5', loading && 'animate-pulse')} />
            </div>
            <p className="text-sm font-medium">
              {loading ? 'Loading scan history…' : 'Not enough history yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? 'Reading your past scans.'
                : 'Run at least two scans and your risk trend, best/worst posture and findings over time appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {stats && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Current risk" value={String(stats.current.risk)} />
                <Stat
                  label="Change"
                  value={`${stats.delta > 0 ? '+' : ''}${stats.delta}`}
                  tone={stats.delta > 0 ? 'bad' : stats.delta < 0 ? 'good' : undefined}
                  icon={
                    stats.delta > 0 ? (
                      <TrendingUp className="size-3.5" />
                    ) : stats.delta < 0 ? (
                      <TrendingDown className="size-3.5" />
                    ) : (
                      <Minus className="size-3.5" />
                    )
                  }
                />
                <Stat label="Best" value={String(stats.best)} tone="good" />
                <Stat label="Worst" value={String(stats.worst)} tone="bad" />
              </div>
            )}

            <RiskChart points={points} />

            <div className="overflow-hidden rounded-md border border-border">
              <div className="border-b border-border bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Scan history
              </div>
              <div className="divide-y divide-border">
                {[...points].reverse().map((p, i, arr) => {
                  const prev = arr[i + 1]
                  const d = prev ? p.risk - prev.risk : 0
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-panel px-3 py-2 text-xs">
                      <span className="w-28 shrink-0 text-muted-foreground">
                        {relativeTime(p.at)}
                      </span>
                      <span className="font-mono font-medium">risk {p.risk}</span>
                      <span className="text-muted-foreground">· {p.findings} findings</span>
                      {prev && (
                        <span
                          className={cn(
                            'ml-auto font-mono',
                            d > 0 ? 'text-critical' : d < 0 ? 'text-ok' : 'text-muted-foreground',
                          )}
                        >
                          {d > 0 ? '+' : ''}
                          {d}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-panel p-3">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'font-mono text-xl font-semibold',
            tone === 'bad' ? 'text-critical' : tone === 'good' ? 'text-ok' : 'text-foreground',
          )}
        >
          {value}
        </span>
        {icon && (
          <span className={cn(tone === 'bad' ? 'text-critical' : tone === 'good' ? 'text-ok' : 'text-muted-foreground')}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

/** Lightweight inline area chart — no dependency, risk 0..100 over time. */
function RiskChart({ points }: { points: { at: string; risk: number }[] }) {
  const W = 720
  const H = 180
  const pad = 8
  const n = points.length
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1)
  const y = (r: number) => pad + ((100 - r) * (H - 2 * pad)) / 100
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.risk)}`).join(' ')
  const area = `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z`

  return (
    <div className="rounded-md border border-border bg-panel p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((g) => (
          <line
            key={g}
            x1={pad}
            x2={W - pad}
            y1={y(g)}
            y2={y(g)}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}
        <path d={area} className="fill-primary/10" />
        <path d={line} className="fill-none stroke-primary" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.risk)} r={2.5} className="fill-primary" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>oldest</span>
        <span>0 = safe · 100 = risky</span>
        <span>latest</span>
      </div>
    </div>
  )
}
