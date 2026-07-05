'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { useScanHistory } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

/** Risk-over-time area chart on the overview, fed by the real scan history.
 *  (Replaces the separate Trends page as the primary home of this chart.) */
export function RiskTrendPanel() {
  const { points, loading } = useScanHistory()

  const delta = useMemo(() => {
    if (points.length < 2) return null
    return points[points.length - 1].risk - points[0].risk
  }, [points])

  return (
    <Panel className="min-h-[220px]">
      <PanelHeader
        title="Risk trend"
        icon={<TrendingUp className="size-3.5 text-primary" />}
        action={
          delta !== null ? (
            <span
              className={cn(
                'flex items-center gap-1 font-mono text-[11px]',
                delta > 0 ? 'text-critical' : delta < 0 ? 'text-ok' : 'text-muted-foreground',
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="size-3" />
              ) : delta < 0 ? (
                <TrendingDown className="size-3" />
              ) : (
                <Minus className="size-3" />
              )}
              {delta > 0 ? '+' : ''}
              {delta} since first scan
            </span>
          ) : (
            <Link href="/risks" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View findings <ArrowUpRight className="size-3" />
            </Link>
          )
        }
      />
      {points.length < 2 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="max-w-xs text-xs text-muted-foreground">
            {loading
              ? 'Loading scan history…'
              : 'Run at least two scans and your risk trend over time appears here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col p-3">
          <Chart points={points} />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>oldest scan</span>
            <span>0 = safe · 100 = risky</span>
            <span>latest</span>
          </div>
        </div>
      )}
    </Panel>
  )
}

function Chart({ points }: { points: { at: string; risk: number }[] }) {
  const W = 720
  const H = 150
  const pad = 8
  const n = points.length
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1)
  const y = (r: number) => pad + ((100 - r) * (H - 2 * pad)) / 100
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.risk)}`).join(' ')
  const area = `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" preserveAspectRatio="none">
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
  )
}
